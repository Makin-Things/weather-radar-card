/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, css, unsafeCSS, TemplateResult, PropertyValues } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor, LovelaceCard, handleAction, ActionConfig } from 'custom-card-helpers';
import * as L from 'leaflet';
// @ts-expect-error — rollup-plugin-string imports CSS as a raw string
import leafletCss from 'leaflet/dist/leaflet.css';

import './editor';
import { WeatherRadarCardConfig } from './types';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';
import { RateLimiter } from './rate-limiter';
import { FetchTileLayer } from './fetch-tile-layer';
import { RadarToolbar } from './radar-toolbar';
import { RadarPlayer } from './radar-player';
import {
  isMobileDevice,
  getCurrentUserInfo,
  getCoordinateConfig,
  resolveCoordinatePair,
} from './coordinate-utils';
import { createMarkerIcon } from './marker-icon';

/* eslint no-console: 0 */
console.info(
  `%c  WEATHER-RADAR-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'weather-radar-card',
  name: 'Weather Radar Card',
  description: 'A rain radar card using tiled imagery from RainViewer and NOAA/NWS',
});

@customElement('weather-radar-card')
export class WeatherRadarCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('weather-radar-card-editor') as LovelaceCardEditor;
  }
  public static getStubConfig(): Record<string, unknown> { return {}; }

  // ── HA properties ────────────────────────────────────────────────────────

  @property({ type: Boolean, reflect: true }) public isPanel = false;
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config!: WeatherRadarCardConfig;
  @property({ attribute: false }) public editMode?: boolean;

  // ── Map / player state ────────────────────────────────────────────────────

  private _map: L.Map | null = null;
  private _townLayer: FetchTileLayer | null = null;
  private _toolbar: RadarToolbar | null = null;
  private _marker: L.Marker | null = null;
  private _rangeRings: L.Circle[] = [];
  private _dynamicStyleEl!: HTMLStyleElement;
  private _player: RadarPlayer | null = null;

  @state() private _pendingCenter: { lat: number; lon: number; zoom: number } | null = null;
  private _userMoveInProgress = false;

  private _navReloadTimer: ReturnType<typeof setTimeout> | null = null;
  private _visObserver: IntersectionObserver | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _visibilityHandler: (() => void) | null = null;
  private _navContainer: HTMLElement | null = null;
  private _markUserMove: (() => void) | null = null;
  private _darkModeQuery: MediaQueryList | null = null;
  private _darkModeHandler: (() => void) | null = null;

  private _rainviewerLimiter = new RateLimiter(500);
  private _noaaLimiter = new RateLimiter(120);

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _effectiveMapStyle(): string {
    const configured = this._config?.map_style?.toLowerCase();
    if (configured && configured !== 'auto') return configured;
    const isEnglish = (this.hass?.language ?? 'en').startsWith('en');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) return 'dark';
    return isEnglish ? 'light' : 'osm';
  }

  private get _isDark(): boolean {
    const s = this._effectiveMapStyle();
    return s === 'dark' || s === 'satellite';
  }

  private _validateCssSize(value: string): boolean {
    return /^\d+(\.\d+)?(px|%|em|rem|vh|vw)$/.test(value);
  }

  private _calculateHeight(): string {
    const cfg = this._config;
    if (cfg.height && this._validateCssSize(cfg.height)) return cfg.height;
    if (cfg.square_map) {
      return cfg.width && this._validateCssSize(cfg.width) ? cfg.width : '100%';
    }
    return '400px';
  }

  // ── HA lifecycle ──────────────────────────────────────────────────────────

  public setConfig(config: WeatherRadarCardConfig): void {
    if (config.height && config.square_map) {
      console.warn("Weather Radar Card: Both 'height' and 'square_map' configured. height takes priority.");
    }
    this._config = config;
    if (this._map) this._teardown();
  }

  public getCardSize(): number { return 10; }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._config) return false;
    return changedProps.has('_config') || changedProps.has('hass')
      || changedProps.has('editMode') || changedProps.has('_pendingCenter');
  }

  protected firstUpdated(): void {
    this._dynamicStyleEl = document.createElement('style');
    this._dynamicStyleEl.id = 'radar-dynamic';
    this.shadowRoot!.appendChild(this._dynamicStyleEl);
    this._initMap();
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has('editMode') && !this.editMode) {
      this._pendingCenter = null;
    }
    if (!this._map && this._config) {
      this._initMap();
    } else if (changedProps.has('_config') && this._map) {
      this._teardown();
      this._initMap();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardown();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  protected render(): TemplateResult | void {
    if (!this._config) return html``;
    const dark = this._isDark;
    return html`
      <ha-card class=${dark ? 'radar-dark' : ''}>
        <div id="color-bar" style="height:8px;display:${this._config.show_color_bar === false ? 'none' : ''}">
          <img id="img-color-bar" height="8" style="vertical-align:top" />
        </div>
        <div id="rate-limit-banner" class="status-banner" style="display:none">
          Rate limited — waiting for quota to reset
        </div>
        ${this.editMode && this._pendingCenter ? html`
          <button class="save-center-btn" @click=${this._savePendingCenter}>
            Save as map center
          </button>
        ` : ''}
        <div id="mapid" style="height:${this._calculateHeight()}"></div>
        <div id="div-progress-bar" style="height:8px;display:${this._config.show_progress_bar === false ? 'none' : 'flex'};background:${dark ? '#1c1c1c' : '#fff'}"></div>
        <div id="bottom-container" class="${dark ? 'dark-links' : 'light-links'}"
             style="height:32px;background:${dark ? '#1c1c1c' : '#fff'};color:${dark ? '#ddd' : ''}">
          <div id="timestampid" style="width:120px;height:32px;float:left;position:absolute">
            <p id="timestamp" style="margin:0;padding:4px 8px;font-size:12px"></p>
          </div>
          <div id="attribution" style="font-size:10px;text-align:right;padding:4px 8px"></div>
        </div>
      </ha-card>
    `;
  }

  // ── Map init / teardown ───────────────────────────────────────────────────

  private _initMap(): void {
    const mapEl = this.shadowRoot?.getElementById('mapid');
    if (!mapEl || this._map) return;

    const cfg = this._config;
    const mapStyle = this._effectiveMapStyle();
    const isMobile = isMobileDevice();
    const userInfo = getCurrentUserInfo(this.hass);
    const haLat = this.hass?.config?.latitude ?? 0;
    const haLon = this.hass?.config?.longitude ?? 0;

    const center = resolveCoordinatePair(
      getCoordinateConfig(cfg.center_latitude, cfg.mobile_center_latitude, isMobile, userInfo?.deviceTracker),
      getCoordinateConfig(cfg.center_longitude, cfg.mobile_center_longitude, isMobile, userInfo?.deviceTracker),
      haLat, haLon, this.hass,
    );

    const isStatic = cfg.static_map === true;
    const hasDoubleTapAction = cfg.double_tap_action && cfg.double_tap_action !== 'none';
    this._map = L.map(mapEl as HTMLElement, {
      zoomControl: cfg.show_zoom === true && !isStatic,
      // Disable Leaflet's built-in double-click zoom when a custom action is configured.
      scrollWheelZoom: !isStatic, doubleClickZoom: !isStatic && !hasDoubleTapAction,
      boxZoom: !isStatic, dragging: !isStatic, keyboard: !isStatic, touchZoom: !isStatic,
      wheelPxPerZoomLevel: 120, attributionControl: false,
      minZoom: 3, maxZoom: 10,
    }).setView([center.lat, center.lon], cfg.zoom_level ?? 7);

    this._setupBasemap(mapStyle);
    this._setupAttribution(mapStyle);
    this._setupMarker(isMobile, userInfo, mapStyle);
    this._setupToolbar();
    this._setupNavListeners();
    this._setupDoubleTapAction();
    this._setupVisibilityObserver();
    this._setupResizeObserver();
    // When map_style is auto (or unset), reinit the map if the OS colour scheme changes.
    if (!cfg.map_style || cfg.map_style.toLowerCase() === 'auto') {
      this._darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this._darkModeHandler = () => { this._teardown(); this.requestUpdate(); };
      this._darkModeQuery.addEventListener('change', this._darkModeHandler);
    }

    this._player = new RadarPlayer({
      map: this._map,
      shadowRoot: this.shadowRoot!,
      getConfig: () => this._config,
      rainviewerLimiter: this._rainviewerLimiter,
      noaaLimiter: this._noaaLimiter,
    });
    this._player.toolbar = this._toolbar;
    this._player.start(cfg.frame_count ?? 5);
  }

  private _teardown(): void {
    if (this._navReloadTimer) clearTimeout(this._navReloadTimer);
    if (this._visObserver) { this._visObserver.disconnect(); this._visObserver = null; }
    if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
    if (this._navContainer && this._markUserMove) {
      this._navContainer.removeEventListener('pointerdown', this._markUserMove);
      this._navContainer.removeEventListener('wheel', this._markUserMove);
      this._navContainer = null;
      this._markUserMove = null;
    }
    if (this._darkModeQuery && this._darkModeHandler) {
      this._darkModeQuery.removeEventListener('change', this._darkModeHandler);
      this._darkModeQuery = null;
      this._darkModeHandler = null;
    }
    this._player?.clear();
    this._player = null;
    if (this._map) { this._map.remove(); this._map = null; }
    this._townLayer = null;
    this._toolbar = null;
    this._marker = null;
    this._rangeRings = [];
  }

  // ── Basemap ───────────────────────────────────────────────────────────────

  private _setupBasemap(mapStyle: string): void {
    if (!this._map) return;
    const cfg = this._config;
    const tileSize = cfg.extra_labels ? 128 : 256;
    const zoomOffset = cfg.extra_labels ? 1 : 0;

    let url: string, style = '', subdomains = 'abcd', labelUrl = '', osmLabels = false;
    switch (mapStyle) {
      case 'dark':
        url = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
        style = 'dark_nolabels';
        labelUrl = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png'; break;
      case 'voyager':
        url = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
        style = 'rastertiles/voyager_nolabels';
        labelUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png'; break;
      case 'satellite':
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/{style}/MapServer/tile/{z}/{y}/{x}';
        style = 'World_Imagery';
        labelUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png'; break;
      case 'osm':
        osmLabels = true; subdomains = 'abc';
        url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; break;
      default:
        url = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
        style = 'light_nolabels';
        labelUrl = 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png';
    }

    new FetchTileLayer(url, { style, subdomains, detectRetina: false, tileSize, zoomOffset } as any)
      .addTo(this._map).setZIndex(0);

    if (!osmLabels && labelUrl) {
      this._townLayer = new FetchTileLayer(labelUrl, {
        subdomains: 'abcd', detectRetina: false, tileSize, zoomOffset,
      } as any).addTo(this._map);
      this._townLayer.setZIndex(2);
    }
  }

  private _setupAttribution(mapStyle: string): void {
    const el = this.shadowRoot?.getElementById('attribution');
    if (!el) return;
    const ds = this._config.data_source ?? 'RainViewer';
    const radarCredit = ds === 'NOAA'
      ? 'Radar: <a href="https://www.weather.gov" target="_blank">NOAA/NWS</a>'
      : 'Radar: <a href="https://rainviewer.com" target="_blank">RainViewer</a>';
    const mapCredit = mapStyle === 'osm'
      ? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
      : mapStyle === 'satellite'
        ? '&copy; <a href="http://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank">ESRI</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attribution" target="_blank">CARTO</a>';
    el.innerHTML = `<a href="https://leafletjs.com" target="_blank">Leaflet</a> | ${mapCredit} | ${radarCredit}`;
  }

  // ── Marker ────────────────────────────────────────────────────────────────

  private _setupMarker(
    isMobile: boolean,
    userInfo: { personEntity: string; deviceTracker?: string } | null,
    mapStyle: string,
  ): void {
    if (!this._map) return;
    const cfg = this._config;
    // Marker falls back to HA's home location, not the map center, so that
    // changing the map center via "Save as map center" doesn't move the marker.
    const haLat = this.hass?.config?.latitude ?? 0;
    const haLon = this.hass?.config?.longitude ?? 0;
    const markerCoords = resolveCoordinatePair(
      getCoordinateConfig(cfg.marker_latitude, cfg.mobile_marker_latitude, isMobile, userInfo?.deviceTracker),
      getCoordinateConfig(cfg.marker_longitude, cfg.mobile_marker_longitude, isMobile, userInfo?.deviceTracker),
      haLat, haLon, this.hass,
    );
    if (cfg.show_marker) {
      const icon = createMarkerIcon(cfg, this.hass, isMobile, userInfo, mapStyle);
      this._marker = L.marker([markerCoords.lat, markerCoords.lon], { icon, interactive: false })
        .addTo(this._map);
    }
    if (cfg.show_range) {
      const metric = (this.hass?.config?.unit_system?.length ?? 'km') === 'km';
      for (const r of (metric ? [50000, 100000, 200000] : [48280, 96561, 193121])) {
        this._rangeRings.push(
          L.circle([markerCoords.lat, markerCoords.lon], { radius: r, weight: 1, fill: false, opacity: 0.3, interactive: false })
            .addTo(this._map),
        );
      }
    }
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────

  private _setupToolbar(): void {
    if (!this._map) return;
    const cfg = this._config;
    const showRecenter = cfg.show_recenter === true && cfg.static_map !== true;
    const showPlayback = cfg.show_playback === true;
    if (!showRecenter && !showPlayback) return;
    this._toolbar = new RadarToolbar({
      showRecenter,
      showPlayback,
      onRecenter: () => this._recenter(),
      onPlay: () => this._player?.togglePlay(),
      onSkipBack: () => this._player?.skipBack(),
      onSkipNext: () => this._player?.skipNext(),
    });
    this._toolbar.addTo(this._map);
  }

  private _savePendingCenter(): void {
    if (!this._pendingCenter) return;
    const { lat, lon, zoom } = this._pendingCenter;
    this._pendingCenter = null;
    // Communicate to the editor element via a window event so the editor can
    // fire config-changed from the correct element. Firing it from the card
    // causes HA to call setConfig back with the old stored config (snap-back).
    window.dispatchEvent(new CustomEvent('weather-radar-center-update', {
      detail: {
        center_latitude: Math.round(lat * 10000) / 10000,
        center_longitude: Math.round(lon * 10000) / 10000,
        zoom_level: zoom,
      },
    }));
  }

  private _setupDoubleTapAction(): void {
    if (!this._map) return;
    const action = this._config.double_tap_action;
    if (!action || action === 'none') return;
    this._map.on('dblclick', (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      if (action === 'recenter') { this._recenter(); return; }
      if (action === 'toggle_play') { this._player?.togglePlay(); return; }
      // HA action object — e.g. {action: 'navigate', navigation_path: '/lovelace/1'}
      if (typeof action === 'object') {
        handleAction(this, this.hass, { tap_action: action as ActionConfig }, 'tap');
      }
    });
  }

  private _recenter(): void {
    if (!this._map) return;
    const cfg = this._config;
    const isMobile = isMobileDevice();
    const c = resolveCoordinatePair(
      getCoordinateConfig(cfg.center_latitude, cfg.mobile_center_latitude, isMobile),
      getCoordinateConfig(cfg.center_longitude, cfg.mobile_center_longitude, isMobile),
      this.hass?.config?.latitude ?? 0, this.hass?.config?.longitude ?? 0, this.hass,
    );
    this._map.setView([c.lat, c.lon], cfg.zoom_level ?? 7);
  }

  // ── Navigation pause ──────────────────────────────────────────────────────

  private _setupNavListeners(): void {
    if (!this._map) return;
    // pointerdown and wheel fire for real user gestures but NOT for programmatic
    // moves like invalidateSize() or setView(). Use them to gate the save button.
    this._navContainer = (this._map as any).getContainer() as HTMLElement;
    this._markUserMove = (): void => { this._userMoveInProgress = true; };
    this._navContainer.addEventListener('pointerdown', this._markUserMove, { passive: true });
    this._navContainer.addEventListener('wheel', this._markUserMove, { passive: true });

    this._map.on('movestart zoomstart', () => {
      if (this._navReloadTimer) clearTimeout(this._navReloadTimer);
      this._player?.onNavPaused();
    });
    this._map.on('moveend zoomend', () => {
      if (this._navReloadTimer) clearTimeout(this._navReloadTimer);
      this._navReloadTimer = setTimeout(() => {
        this._player?.onNavSettled(this._config.frame_count ?? 5);
      }, 100);
      if (this._userMoveInProgress && this.editMode && this._map) {
        const c = this._map.getCenter();
        this._pendingCenter = { lat: c.lat, lon: c.lng, zoom: this._map.getZoom() };
      }
      this._userMoveInProgress = false;
    });
  }

  // ── Visibility / resize observers ─────────────────────────────────────────

  private _setupVisibilityObserver(): void {
    this._visObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) this._player?.onVisibilityVisible();
      else this._player?.onVisibilityHidden();
    }, { threshold: 0.1 });
    this._visObserver.observe(this);
    this._visibilityHandler = () => {
      if (document.hidden) this._player?.onVisibilityHidden();
      else this._player?.onVisibilityVisible();
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  private _setupResizeObserver(): void {
    const mapEl = this.shadowRoot?.getElementById('mapid');
    if (!mapEl) return;
    this._resizeObserver = new ResizeObserver(() => this._map?.invalidateSize());
    this._resizeObserver.observe(mapEl);
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  static styles = [
    unsafeCSS(leafletCss),
    css`
      :host { display: block; }
      ha-card { overflow: hidden; position: relative; }
      #mapid { width: 100%; position: relative; }
      .status-banner {
        position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
        z-index: 1000; background: rgba(180,60,0,0.85); color: #fff;
        padding: 4px 12px; border-radius: 4px;
        font: 12px/1.5 'Helvetica Neue',Arial,sans-serif;
        pointer-events: none; white-space: nowrap;
      }
      .marker-entity-picture {
        border-radius: 50%; border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.4); object-fit: cover;
      }
      .marker-mdi-icon { background: none; border: none; }
      .radar-toolbar { background: white; border-radius: 4px; }
      .radar-toolbar li { list-style: none; }
      .light-links a { color: #0078a8; }
      .dark-links a { color: #88ccff; }
      #bottom-container { font-size: 10px; position: relative; }
      .radar-dark .leaflet-control-scale-line {
        color: #bbb; border-color: #bbb; background: rgba(0,0,0,0.5);
      }
      .save-center-btn {
        position: absolute; bottom: 48px; left: 50%; transform: translateX(-50%);
        z-index: 1000; background: var(--primary-color); color: var(--text-primary-color, #fff);
        border: none; border-radius: 4px; padding: 6px 16px; cursor: pointer;
        font: 12px/1.5 'Helvetica Neue', Arial, sans-serif;
        white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      }
    `,
  ];
}
