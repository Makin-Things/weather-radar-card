/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, css, unsafeCSS, TemplateResult, PropertyValues } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor, LovelaceCard, handleAction, ActionConfig } from 'custom-card-helpers';
import * as L from 'leaflet';
// @ts-expect-error — rollup-plugin-string imports CSS as a raw string
import leafletCss from 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
// @ts-expect-error — rollup-plugin-string imports CSS as a raw string
import markerClusterCss from 'leaflet.markercluster/dist/MarkerCluster.css';

import './editor';
import { WeatherRadarCardConfig, Marker } from './types';
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
import { createMarkerIconForMarker, MDI_PATHS } from './marker-icon';
import { migrateConfig, resolveMarkerPosition, resolveTracking, isAtHome } from './marker-utils';

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
  private _markers: Map<number, L.Marker> = new Map();
  private _clusterGroup: L.MarkerClusterGroup | null = null;
  private _trackedMarkerIdx = -1;
  private _clusterSpiderfied = false;
  private _lastTrackedPosition: { lat: number; lon: number } | null = null;
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
    return '400px';
  }

  // ── HA lifecycle ──────────────────────────────────────────────────────────

  public setConfig(config: WeatherRadarCardConfig): void {
    if (config.height && config.square_map) {
      console.warn("Weather Radar Card: Both 'height' and 'square_map' configured. height takes priority.");
    }
    this._config = this._migrateConfig(config);
    if (this._map) this._teardown();
  }

  private _migrateConfig(config: WeatherRadarCardConfig): WeatherRadarCardConfig {
    const result = migrateConfig(config);
    if (result !== config) {
      console.warn('Weather Radar Card: single-marker config fields are deprecated. Migrate to the markers[] array format.');
    }
    return result;
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
    this._setupProgressBarScrub();
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
    } else if (changedProps.has('hass') && this._map && this._markers.size > 0) {
      this._updateMarkerPositions();
      const hasTracking = (this._config?.markers ?? []).some(m => m.track);
      if (hasTracking) this._resolveTracking();
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
        <div id="mapid" style="${this._config.square_map && !this._config.height ? 'aspect-ratio:1/1' : `height:${this._calculateHeight()}`}"></div>
        <div id="div-progress-bar" style="height:8px;cursor:pointer;display:${this._config.show_progress_bar === false ? 'none' : 'flex'};background:${dark ? '#1c1c1c' : '#fff'}"></div>
        <div id="bottom-container" class="${dark ? 'dark-links' : 'light-links'}"
             style="height:32px;background:${dark ? '#1c1c1c' : '#fff'};color:${dark ? '#ddd' : ''}">
          <div id="timestampid" style="height:32px;float:left;position:absolute">
            <p id="timestamp" style="margin:0;padding:4px 8px;font-size:12px;white-space:nowrap"></p>
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

    if (cfg.disable_scroll === true && !isStatic) {
      this._map.dragging.disable();
    }
    if (cfg.show_scale === true) {
      const metric = (this.hass?.config?.unit_system?.length ?? 'km') === 'km';
      L.control.scale({ imperial: !metric, metric }).addTo(this._map);
    }
    this._setupBasemap(mapStyle);
    this._setupAttribution(mapStyle);
    this._setupMarkers(mapStyle);
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
    if (this._clusterGroup) { this._clusterGroup.clearLayers(); this._clusterGroup = null; }
    this._clusterSpiderfied = false;
    if (this._map) { this._map.remove(); this._map = null; }
    this._townLayer = null;
    this._toolbar = null;
    this._markers.clear();
    this._trackedMarkerIdx = -1;
    this._lastTrackedPosition = null;
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

  // ── Markers ───────────────────────────────────────────────────────────────

  private _createClusterIcon(cluster: L.MarkerCluster, isDark: boolean): L.DivIcon {
    const count = cluster.getChildCount();
    const children = cluster.getAllChildMarkers() as any[];
    const hasHome = children.some(m => {
      const cfg = m._wrcCfg as Marker | undefined;
      return cfg?.entity === 'zone.home' || !cfg?.icon || cfg?.icon === 'default';
    });

    const bg = isDark ? '#1a1a2e' : '#ffffff';
    const fg = isDark ? '#e0e0e0' : '#333333';
    const ring = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)';
    const size = count < 10 ? 32 : count < 100 ? 38 : 44;
    const fs = count < 10 ? 12 : count < 100 ? 11 : 10;
    const iconSz = Math.round(size * 0.45);

    const inner = hasHome
      ? `<svg viewBox="0 0 24 24" width="${iconSz}" height="${iconSz}"><path fill="${fg}" d="${MDI_PATHS['home-circle']}"/></svg><span style="font:${fs}px/1 'Helvetica Neue',Arial,sans-serif;font-weight:bold">${count}</span>`
      : `<span style="font:${fs}px/1 'Helvetica Neue',Arial,sans-serif;font-weight:bold">${count}</span>`;

    return L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;background:${bg};border:2px solid ${ring};border-radius:50%;display:flex;align-items:center;justify-content:center;gap:2px;color:${fg};box-shadow:0 2px 6px rgba(0,0,0,0.35)">${inner}</div>`,
      className: 'weather-radar-cluster',
      iconSize: [size, size] as L.PointExpression,
    });
  }

  private _setupMarkers(mapStyle: string): void {
    if (!this._map) return;
    const cfg = this._config;
    const markers = cfg.markers ?? [];
    const isMobile = isMobileDevice();
    const haLat = this.hass?.config?.latitude ?? 0;
    const haLon = this.hass?.config?.longitude ?? 0;
    const useClustering = cfg.cluster_markers === true && markers.length > 1;
    let rangeRingsSet = false;

    // Determine tracking winner upfront — the tracked marker bypasses the cluster.
    const initialWinner = resolveTracking(markers, this.hass, haLat, haLon);
    this._trackedMarkerIdx = initialWinner?.markerIndex ?? -1;

    if (useClustering) {
      const isDark = mapStyle === 'dark' || mapStyle === 'satellite';
      this._clusterGroup = L.markerClusterGroup({
        iconCreateFunction: (c) => this._createClusterIcon(c, isDark),
        maxClusterRadius: 60,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: false,  // zoom-to-bounds re-clusters immediately at the same zoom
        spiderfyOnMaxZoom: false,    // handled by clusterclick below
        animate: true,
      });
      // Always spiderfy on click. Stop the DOM event so it doesn't bubble to the
      // map container — without this, markercluster's map-level 'click' listener
      // (_unspiderfyWrapper) fires in the same tick and immediately collapses it.
      this._clusterGroup.on('clusterclick', (e: any) => {
        if (e.originalEvent) L.DomEvent.stop(e.originalEvent);
        // Set the flag BEFORE calling spiderfy() so that any hass update arriving
        // during the animation does not snap markers back to their entity positions.
        this._clusterSpiderfied = true;
        e.layer.spiderfy();
      });
      this._clusterGroup.on('spiderfied', () => { this._clusterSpiderfied = true; });
      this._clusterGroup.on('unspiderfied', () => { this._clusterSpiderfied = false; });
      this._clusterGroup.addTo(this._map);
    }

    for (let i = 0; i < markers.length; i++) {
      const markerCfg = markers[i];
      if (markerCfg.mobile_only && !isMobile) continue;

      const { lat, lon } = resolveMarkerPosition(markerCfg, this.hass, haLat, haLon);
      const icon = createMarkerIconForMarker(markerCfg, this.hass, mapStyle);
      const lMarker = L.marker([lat, lon], { icon, interactive: false });
      (lMarker as any)._wrcCfg = markerCfg;
      const atHome = isAtHome(markerCfg, lat, lon, haLat, haLon, this.hass);
      this._markers.set(i, lMarker);
      lMarker.setZIndexOffset(i === this._trackedMarkerIdx ? 1000 : 0);

      if (useClustering && i !== this._trackedMarkerIdx) {
        // Non-tracked markers go into the cluster group unless at home.
        if (!atHome) this._clusterGroup!.addLayer(lMarker);
      } else {
        lMarker.addTo(this._map);
        lMarker.setOpacity(atHome ? 0 : 1);
      }

      if (!rangeRingsSet && cfg.show_range) {
        const metric = (this.hass?.config?.unit_system?.length ?? 'km') === 'km';
        for (const r of (metric ? [50000, 100000, 200000] : [48280, 96561, 193121])) {
          this._rangeRings.push(
            L.circle([lat, lon], { radius: r, weight: 1, fill: false, opacity: 0.3, interactive: false })
              .addTo(this._map),
          );
        }
        rangeRingsSet = true;
      }
    }
  }

  private _updateMarkerPositions(): void {
    const markers = this._config?.markers ?? [];
    const haLat = this.hass?.config?.latitude ?? 0;
    const haLon = this.hass?.config?.longitude ?? 0;
    for (const [i, lMarker] of this._markers.entries()) {
      const markerCfg = markers[i];
      if (!markerCfg) continue;
      const { lat, lon } = resolveMarkerPosition(markerCfg, this.hass, haLat, haLon);
      const atHome = isAtHome(markerCfg, lat, lon, haLat, haLon, this.hass);

      // Skip setLatLng for clustered markers while spiderfied. During spiderfy,
      // markercluster calls setLatLng(spiderPosition) on each marker to place it
      // at its leg endpoint. Calling setLatLng(originalPosition) here would snap
      // it back to the cluster centre, making the icons vanish while the cluster
      // icon stays grey (spiderfied state but no visible markers).
      const inSpiderfy = this._clusterSpiderfied && this._clusterGroup && i !== this._trackedMarkerIdx;
      if (!inSpiderfy) {
        const cur = lMarker.getLatLng();
        if (cur.lat !== lat || cur.lng !== lon) lMarker.setLatLng([lat, lon]);
      }

      if (this._clusterGroup && i !== this._trackedMarkerIdx) {
        const inCluster = this._clusterGroup.hasLayer(lMarker);
        if (atHome && inCluster) {
          this._clusterGroup.removeLayer(lMarker);
        } else if (!atHome && !inCluster) {
          this._clusterGroup.addLayer(lMarker);
        }
      } else {
        lMarker.setOpacity(atHome ? 0 : 1);
      }
    }
  }

  private _resolveTracking(): void {
    if (!this._map || this._userMoveInProgress) return;
    const markers = this._config?.markers ?? [];
    const haLat = this.hass?.config?.latitude ?? 0;
    const haLon = this.hass?.config?.longitude ?? 0;
    const result = resolveTracking(markers, this.hass, haLat, haLon);
    const newWinnerIdx = result?.markerIndex ?? -1;

    // Move tracked marker between layers when the winner changes.
    if (this._clusterGroup && newWinnerIdx !== this._trackedMarkerIdx) {
      this._moveTrackedMarker(newWinnerIdx);
    } else {
      this._trackedMarkerIdx = newWinnerIdx;
    }

    // Keep the tracked marker above all others.
    // Skip while spiderfied — markercluster sets zIndexOffset:1000000 on each
    // spiderfied marker so they appear above the cluster icon; resetting to 0
    // would make them sink below the cluster icon and become invisible.
    if (!this._clusterSpiderfied) {
      for (const [i, lMarker] of this._markers.entries()) {
        lMarker.setZIndexOffset(newWinnerIdx === i ? 1000 : 0);
      }
    }
    if (result) {
      const last = this._lastTrackedPosition;
      // Only pan when the tracked marker has actually moved (>~10 m).
      // Calling panTo every hass tick with the same coords causes unnecessary
      // map animation and move events even when the entity hasn't changed position.
      const moved = !last ||
        Math.abs(last.lat - result.lat) > 0.0001 ||
        Math.abs(last.lon - result.lon) > 0.0001;
      if (moved) {
        this._lastTrackedPosition = { lat: result.lat, lon: result.lon };
        this._map.panTo([result.lat, result.lon]);
      }
    } else {
      this._lastTrackedPosition = null;
    }
  }

  private _moveTrackedMarker(newWinnerIdx: number): void {
    const markers = this._config?.markers ?? [];
    const haLat = this.hass?.config?.latitude ?? 0;
    const haLon = this.hass?.config?.longitude ?? 0;

    // Return old tracked marker to the cluster group (unless it's at home).
    if (this._trackedMarkerIdx >= 0) {
      const old = this._markers.get(this._trackedMarkerIdx);
      const oldCfg = markers[this._trackedMarkerIdx];
      if (old && oldCfg && this._map?.hasLayer(old)) {
        this._map.removeLayer(old);
        const pos = resolveMarkerPosition(oldCfg, this.hass, haLat, haLon);
        if (!isAtHome(oldCfg, pos.lat, pos.lon, haLat, haLon, this.hass)) {
          this._clusterGroup!.addLayer(old);
        }
      }
    }

    // Promote new tracked marker out of the cluster group onto the map directly.
    if (newWinnerIdx >= 0) {
      const nw = this._markers.get(newWinnerIdx);
      if (nw) {
        if (this._clusterGroup!.hasLayer(nw)) this._clusterGroup!.removeLayer(nw);
        nw.addTo(this._map!);
      }
    }
    this._trackedMarkerIdx = newWinnerIdx;
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

  private _setupProgressBarScrub(): void {
    const bar = this.shadowRoot?.getElementById('div-progress-bar');
    if (!bar) return;
    let active = false;

    const seek = (e: PointerEvent): void => {
      if (!this._player || this._player.frameCount === 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1 - 1e-9, (e.clientX - rect.left) / rect.width));
      this._player.scrubTo(Math.floor(ratio * this._player.frameCount));
    };

    bar.addEventListener('pointerdown', (e) => {
      active = true;
      bar.setPointerCapture(e.pointerId);
      seek(e);
    });
    bar.addEventListener('pointermove', (e) => { if (active) seek(e); });
    bar.addEventListener('pointerup', () => {
      if (!active) return;
      active = false;
      this._player?.scrubEnd();
    });
    bar.addEventListener('pointercancel', () => {
      active = false;
      this._player?.scrubEnd();
    });
  }

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
    unsafeCSS(markerClusterCss),
    css`
      :host { display: block; isolation: isolate; }
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
