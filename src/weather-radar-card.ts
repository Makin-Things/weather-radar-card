/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, css, unsafeCSS, TemplateResult, PropertyValues } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor, LovelaceCard } from 'custom-card-helpers';
import * as L from 'leaflet';

// CSS imported as raw strings via rollup-plugin-string
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import leafletCss from 'leaflet/dist/leaflet.css';

import './editor';
import { WeatherRadarCardConfig, CoordinateConfig } from './types';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';
import { RateLimiter } from './rate-limiter';
import { FetchTileLayer, FetchWmsTileLayer, layerSettled } from './fetch-tile-layer';
import { RadarToolbar } from './radar-toolbar';

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

type FrameStatus = 'empty' | 'loading' | 'loaded' | 'failed';

interface RadarFrame { time: number; path: string; host?: string; }

const NOAA_WMS_URL = 'https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer';
const NOAA_WMS_LAYER = 'radar_base_reflectivity_time';
const ICON_BASE = '/local/community/weather-radar-card/';

@customElement('weather-radar-card')
export class WeatherRadarCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('weather-radar-card-editor') as LovelaceCardEditor;
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  // ── HA properties ──────────────────────────────────────────────────────────

  @property({ type: Boolean, reflect: true }) public isPanel = false;
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config!: WeatherRadarCardConfig;
  @property({ attribute: false }) public editMode?: boolean;

  // ── Map state ───────────────────────────────────────────────────────────────

  private _map: L.Map | null = null;
  private _townLayer: FetchTileLayer | null = null;
  private _toolbar: RadarToolbar | null = null;
  private _marker: L.Marker | null = null;
  private _rangeRings: L.Circle[] = [];
  private _dynamicStyleEl!: HTMLStyleElement;

  // ── Radar state ─────────────────────────────────────────────────────────────

  private _radarImage: (FetchTileLayer | FetchWmsTileLayer)[] = [];
  private _radarTime: string[] = [];
  private _radarPaths: RadarFrame[] = [];
  private _loadedSlots: number[] = [];
  private _frameStatuses: FrameStatus[] = [];
  private _radarReady = false;
  private _frameGeneration = 0;
  private _configFrameCount = 5;
  private _doRadarUpdate = false;

  // ── Animation state ─────────────────────────────────────────────────────────

  private _animStartWallTime = 0;
  private _animPauseStartTime: number | null = null;
  private _animAccPauseMs = 0;

  // ── Playback / navigation state ─────────────────────────────────────────────

  private _run = true;
  private _navPaused = false;
  private _viewPaused = false;
  private _navReloadTimer: ReturnType<typeof setTimeout> | null = null;
  private _navRestoreTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Observers / workers ─────────────────────────────────────────────────────

  private _visObserver: IntersectionObserver | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _updateWorker: Worker | null = null;
  private _updateWorkerCallbacks = new Map<number, () => void>();
  private _updateWorkerNextId = 0;

  // ── Rate limiters ───────────────────────────────────────────────────────────

  private _rainviewerLimiter = new RateLimiter(500); // confirmed from x-ratelimit-limit response header
  private _noaaLimiter = new RateLimiter(120);

  // ── Dark mode ───────────────────────────────────────────────────────────────

  private get _isDark(): boolean {
    const s = (this._config?.map_style ?? 'light').toLowerCase();
    return s === 'dark' || s === 'satellite';
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HA lifecycle
  // ───────────────────────────────────────────────────────────────────────────

  public setConfig(config: WeatherRadarCardConfig): void {
    if (config.height && config.square_map) {
      console.warn("Weather Radar Card: Both 'height' and 'square_map' configured. height takes priority.");
    }
    this._config = config;
    this._configFrameCount = config.frame_count ?? 5;

    // If map already exists, tear down and re-init on next update
    if (this._map) {
      this._teardown();
    }
  }

  public getCardSize(): number {
    return 10;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._config) return false;
    return changedProps.has('_config') || changedProps.has('hass');
  }

  protected firstUpdated(): void {
    this._dynamicStyleEl = document.createElement('style');
    this._dynamicStyleEl.id = 'radar-dynamic';
    this.shadowRoot!.appendChild(this._dynamicStyleEl);
    this._initMap();
  }

  protected updated(changedProps: PropertyValues): void {
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

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  protected render(): TemplateResult | void {
    if (!this._config) return html``;

    const height = this._calculateHeight();
    const dark = this._isDark;

    return html`
      <ha-card class=${dark ? 'radar-dark' : ''}>
        <div id="color-bar" style="height:8px">
          <img id="img-color-bar" height="8" style="vertical-align:top" />
        </div>
        <div id="nav-banner" class="nav-banner" style="display:none">Paused while Navigating</div>
        <div id="mapid" style="height:${height}"></div>
        <div id="div-progress-bar" style="height:8px;display:flex;background:${dark ? '#1c1c1c' : '#fff'}"></div>
        <div id="bottom-container" class="${dark ? 'dark-links' : 'light-links'}"
             style="height:32px;background:${dark ? '#1c1c1c' : '#fff'};color:${dark ? '#ddd' : ''}">
          <div id="timestampid" class="text-container" style="width:120px;height:32px;float:left;position:absolute">
            <p id="timestamp" style="margin:0;padding:4px 8px;font-size:12px"></p>
          </div>
          <div id="attribution" style="font-size:10px;text-align:right;padding:4px 8px"></div>
        </div>
      </ha-card>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Map init / teardown
  // ───────────────────────────────────────────────────────────────────────────

  private _initMap(): void {
    const mapEl = this.shadowRoot?.getElementById('mapid');
    if (!mapEl || this._map) return;

    const cfg = this._config;
    const isMobile = this._isMobileDevice();
    const userInfo = this._getCurrentUserInfo();
    const haLat = this.hass?.config?.latitude ?? 0;
    const haLon = this.hass?.config?.longitude ?? 0;

    const center = this._resolveCoordinatePair(
      this._getCoordinateConfig(cfg.center_latitude, cfg.mobile_center_latitude, isMobile, userInfo?.deviceTracker),
      this._getCoordinateConfig(cfg.center_longitude, cfg.mobile_center_longitude, isMobile, userInfo?.deviceTracker),
      haLat, haLon,
    );

    const mapStyle = (cfg.map_style ?? 'light').toLowerCase();
    const zoom = cfg.zoom_level ?? 7;
    const minZoom = 3;
    const maxZoom = 10;
    const isStatic = cfg.static_map === true;

    this._map = L.map(mapEl as HTMLElement, {
      zoomControl: cfg.show_zoom === true && !isStatic,
      scrollWheelZoom: !isStatic,
      doubleClickZoom: !isStatic,
      boxZoom: !isStatic,
      dragging: !isStatic,
      keyboard: !isStatic,
      touchZoom: !isStatic,
      wheelPxPerZoomLevel: 120,
      attributionControl: false,
      minZoom,
      maxZoom,
    }).setView([center.lat, center.lon], zoom);

    this._setupBasemap(mapStyle);
    this._setupAttribution(mapStyle);
    this._setupMarker(isMobile, userInfo, center, mapStyle);
    this._setupToolbar();
    this._setupNavListeners();
    this._setupVisibilityObserver();
    this._setupResizeObserver();
    this._createUpdateWorker();
    this._buildProgressSegments();
    this._initRadar();
  }

  private _teardown(): void {
    if (this._navReloadTimer) clearTimeout(this._navReloadTimer);
    if (this._navRestoreTimer) clearTimeout(this._navRestoreTimer);
    if (this._visObserver) { this._visObserver.disconnect(); this._visObserver = null; }
    if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
    if (this._updateWorker) { this._updateWorker.terminate(); this._updateWorker = null; }
    this._frameGeneration++;
    if (this._map) { this._map.remove(); this._map = null; }
    this._radarImage = [];
    this._radarTime = [];
    this._radarPaths = [];
    this._loadedSlots = [];
    this._frameStatuses = [];
    this._radarReady = false;
    this._townLayer = null;
    this._toolbar = null;
    this._marker = null;
    this._rangeRings = [];
    this._run = true;
    this._navPaused = false;
    this._viewPaused = false;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Basemap
  // ───────────────────────────────────────────────────────────────────────────

  private _setupBasemap(mapStyle: string): void {
    if (!this._map) return;
    const cfg = this._config;
    const tileSize = cfg.extra_labels ? 128 : 256;
    const zoomOffset = cfg.extra_labels ? 1 : 0;

    let basemapUrl: string;
    let basemapStyle = '';
    let basemapSubdomains = 'abcd';
    let labelUrl = '';
    let osmLabels = false;

    switch (mapStyle) {
      case 'dark':
        basemapUrl = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
        basemapStyle = 'dark_nolabels';
        labelUrl = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png';
        break;
      case 'voyager':
        basemapUrl = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
        basemapStyle = 'rastertiles/voyager_nolabels';
        labelUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png';
        break;
      case 'satellite':
        basemapUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/{style}/MapServer/tile/{z}/{y}/{x}';
        basemapStyle = 'World_Imagery';
        labelUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png';
        break;
      case 'osm':
        osmLabels = true;
        basemapUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        basemapSubdomains = 'abc';
        break;
      default: // light
        basemapUrl = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
        basemapStyle = 'light_nolabels';
        labelUrl = 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png';
    }

    new FetchTileLayer(basemapUrl, {
      style: basemapStyle,
      subdomains: basemapSubdomains,
      detectRetina: false,
      tileSize,
      zoomOffset,
    } as any).addTo(this._map).setZIndex(0);

    if (!osmLabels && labelUrl) {
      this._townLayer = new FetchTileLayer(labelUrl, {
        subdomains: 'abcd',
        detectRetina: false,
        tileSize,
        zoomOffset,
      } as any).addTo(this._map);
      this._townLayer.setZIndex(2);
    }
  }

  private _setupAttribution(mapStyle: string): void {
    const el = this.shadowRoot?.getElementById('attribution');
    if (!el) return;
    const dataSource = this._config.data_source ?? 'RainViewer';
    const radarCredit = dataSource === 'NOAA'
      ? 'Radar: <a href="https://www.weather.gov" target="_blank">NOAA/NWS</a>'
      : 'Radar: <a href="https://rainviewer.com" target="_blank">RainViewer</a>';
    const mapCredit = mapStyle === 'osm'
      ? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
      : mapStyle === 'satellite'
        ? '&copy; <a href="http://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank">ESRI</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attribution" target="_blank">CARTO</a>';
    el.innerHTML = `<a href="https://leafletjs.com" target="_blank">Leaflet</a> | ${mapCredit} | ${radarCredit}`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Marker
  // ───────────────────────────────────────────────────────────────────────────

  private _setupMarker(
    isMobile: boolean,
    userInfo: { personEntity: string; deviceTracker?: string } | null,
    center: { lat: number; lon: number },
    mapStyle: string,
  ): void {
    const cfg = this._config;
    if (!this._map) return;

    const markerCoords = this._resolveCoordinatePair(
      this._getCoordinateConfig(cfg.marker_latitude, cfg.mobile_marker_latitude, isMobile, userInfo?.deviceTracker),
      this._getCoordinateConfig(cfg.marker_longitude, cfg.mobile_marker_longitude, isMobile, userInfo?.deviceTracker),
      center.lat, center.lon,
    );

    if (cfg.show_marker) {
      const icon = this._createMarkerIcon(isMobile, userInfo, mapStyle);
      this._marker = L.marker([markerCoords.lat, markerCoords.lon], { icon, interactive: false }).addTo(this._map);
    }

    if (cfg.show_range) {
      const metric = (this.hass?.config?.unit_system?.length ?? 'km') === 'km';
      const radii = metric ? [50000, 100000, 200000] : [48280, 96561, 193121];
      for (const r of radii) {
        const ring = L.circle([markerCoords.lat, markerCoords.lon], {
          radius: r, weight: 1, fill: false, opacity: 0.3, interactive: false,
        }).addTo(this._map);
        this._rangeRings.push(ring);
      }
    }
  }

  private _createMarkerIcon(
    isMobile: boolean,
    userInfo: { personEntity: string; deviceTracker?: string } | null,
    mapStyle: string,
  ): L.Icon | L.DivIcon {
    const iconCfg = this._getMarkerIconConfig(isMobile, userInfo);
    const svgFile = mapStyle === 'dark' ? 'home-circle-light.svg' : 'home-circle-dark.svg';

    if (!iconCfg.type || iconCfg.type === 'default') {
      return L.icon({ iconUrl: `${ICON_BASE}${svgFile}`, iconSize: [16, 16] });
    }

    if (iconCfg.type === 'entity_picture') {
      const pictureUrl = this._resolveEntityPicture(iconCfg.entity);
      if (!pictureUrl) {
        return L.icon({ iconUrl: `${ICON_BASE}${svgFile}`, iconSize: [16, 16] });
      }
      return L.icon({ iconUrl: pictureUrl, iconSize: [32, 32], className: 'marker-entity-picture' });
    }

    if (iconCfg.type.startsWith('mdi:')) {
      const name = iconCfg.type.substring(4);
      const path = WeatherRadarCard.MDI_PATHS[name];
      if (!path) return L.icon({ iconUrl: `${ICON_BASE}${svgFile}`, iconSize: [16, 16] });
      const colour = (mapStyle === 'dark' || mapStyle === 'satellite') ? '#EEEEEE' : '#333333';
      return L.divIcon({
        html: `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="${colour}" d="${path}"/></svg>`,
        iconSize: [24, 24],
        className: 'marker-mdi-icon',
      });
    }

    return L.icon({ iconUrl: `${ICON_BASE}${svgFile}`, iconSize: [16, 16] });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Toolbar
  // ───────────────────────────────────────────────────────────────────────────

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
      onPlay: () => this._togglePlay(),
      onSkipBack: () => this._skipBack(),
      onSkipNext: () => this._skipNext(),
    });
    this._toolbar.addTo(this._map);
  }

  private _recenter(): void {
    if (!this._map) return;
    const cfg = this._config;
    const isMobile = this._isMobileDevice();
    const haLat = this.hass?.config?.latitude ?? 0;
    const haLon = this.hass?.config?.longitude ?? 0;
    const c = this._resolveCoordinatePair(
      this._getCoordinateConfig(cfg.center_latitude, cfg.mobile_center_latitude, isMobile),
      this._getCoordinateConfig(cfg.center_longitude, cfg.mobile_center_longitude, isMobile),
      haLat, haLon,
    );
    this._map.setView([c.lat, c.lon], cfg.zoom_level ?? 7);
  }

  private _togglePlay(): void {
    this._run = !this._run;
    if (this._run) {
      this._resumeAnimations();
    } else {
      this._pauseAnimations();
    }
  }

  private _skipNext(): void {
    if (!this._radarReady) return;
    const n = this._loadedSlots.length;
    if (n < 2) return;
    const totalMs = n * this._timeout + this._restartDelay;
    const elapsed = this._getAnimElapsed() % totalMs;
    const slot = Math.min(Math.floor(elapsed / this._timeout), n - 1);
    this._seekToFrame((slot + 1) % n);
    this._pauseAnimations();
    this._run = false;
    this._toolbar?.setPlaying(false);
  }

  private _skipBack(): void {
    if (!this._radarReady) return;
    const n = this._loadedSlots.length;
    if (n < 2) return;
    const totalMs = n * this._timeout + this._restartDelay;
    const elapsed = this._getAnimElapsed() % totalMs;
    const slot = Math.min(Math.floor(elapsed / this._timeout), n - 1);
    this._seekToFrame((slot - 1 + n) % n);
    this._pauseAnimations();
    this._run = false;
    this._toolbar?.setPlaying(false);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Navigation pause
  // ───────────────────────────────────────────────────────────────────────────

  private _setupNavListeners(): void {
    if (!this._map) return;
    this._map.on('movestart zoomstart', () => this._onNavStart());
    this._map.on('moveend zoomend', () => this._onNavEnd());
  }

  private _onNavStart(): void {
    if (this._navReloadTimer) clearTimeout(this._navReloadTimer);
    if (this._navRestoreTimer) clearTimeout(this._navRestoreTimer);
    if (!this._navPaused) {
      this._navPaused = true;
      const banner = this.shadowRoot?.getElementById('nav-banner');
      if (banner) banner.style.display = 'block';
      this._pauseAnimations();
      for (let i = 0; i < this._configFrameCount; i++) this._setSegmentStatus(i, 'empty');
    }
  }

  private _onNavEnd(): void {
    if (this._navReloadTimer) clearTimeout(this._navReloadTimer);
    if (this._navRestoreTimer) clearTimeout(this._navRestoreTimer);
    this._navReloadTimer = setTimeout(() => {
      if (this._run) { this._animPauseStartTime = null; this._animAccPauseMs = 0; }
      this._loadSingleFrame();
      this._navRestoreTimer = setTimeout(() => {
        this._navPaused = false;
        const banner = this.shadowRoot?.getElementById('nav-banner');
        if (banner) banner.style.display = 'none';
        if (this._run) { this._animPauseStartTime = null; this._animAccPauseMs = 0; }
        this._clearRadarLayers();
        this._configFrameCount = this._config.frame_count ?? 5;
        this._initRadar();
      }, 5000);
    }, 250);
  }

  private _loadSingleFrame(): void {
    this._clearRadarLayers();
    this._configFrameCount = 1;
    this._initRadar();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Scroll / tab visibility pause
  // ───────────────────────────────────────────────────────────────────────────

  private _setupVisibilityObserver(): void {
    this._visObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) this._onBecameVisible();
      else this._onBecameHidden();
    }, { threshold: 0.1 });
    this._visObserver.observe(this);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._onBecameHidden();
      else this._onBecameVisible();
    });
  }

  private _onBecameVisible(): void {
    if (!this._viewPaused) return;
    this._viewPaused = false;
    if (this._doRadarUpdate && this._radarReady) {
      this._doRadarUpdate = false;
      this._updateRadar();
    } else {
      this._resumeAnimations();
    }
  }

  private _onBecameHidden(): void {
    this._viewPaused = true;
    this._pauseAnimations();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Resize
  // ───────────────────────────────────────────────────────────────────────────

  private _setupResizeObserver(): void {
    const mapEl = this.shadowRoot?.getElementById('mapid');
    if (!mapEl) return;
    this._resizeObserver = new ResizeObserver(() => {
      this._map?.invalidateSize();
      this._buildProgressSegments(); // recalculate segment widths
    });
    this._resizeObserver.observe(mapEl);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Web Worker timer (avoids background-tab throttling)
  // ───────────────────────────────────────────────────────────────────────────

  private _createUpdateWorker(): void {
    const code = `
      var timers = {};
      self.onmessage = function(e) {
        if (e.data.type === 'setTimeout') {
          timers[e.data.id] = setTimeout(function() {
            delete timers[e.data.id];
            self.postMessage({ type: 'timeout', id: e.data.id });
          }, e.data.delay);
        } else if (e.data.type === 'clearTimeout') {
          clearTimeout(timers[e.data.id]);
          delete timers[e.data.id];
        }
      };
    `;
    this._updateWorker = new Worker(URL.createObjectURL(new Blob([code], { type: 'application/javascript' })));
    this._updateWorker.onmessage = (e) => {
      const cb = this._updateWorkerCallbacks.get(e.data.id);
      if (cb) { this._updateWorkerCallbacks.delete(e.data.id); cb(); }
    };
  }

  private _workerTimeout(cb: () => void, delay: number): void {
    if (!this._updateWorker) { setTimeout(cb, delay); return; }
    const id = this._updateWorkerNextId++;
    this._updateWorkerCallbacks.set(id, cb);
    this._updateWorker.postMessage({ type: 'setTimeout', id, delay });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Progress bar
  // ───────────────────────────────────────────────────────────────────────────

  private _buildProgressSegments(): void {
    const bar = this.shadowRoot?.getElementById('div-progress-bar');
    if (!bar) return;
    bar.innerHTML = '';
    this._frameStatuses = new Array(this._configFrameCount).fill('empty') as FrameStatus[];
    for (let i = 0; i < this._configFrameCount; i++) {
      const seg = document.createElement('div');
      seg.id = `seg-${i}`;
      seg.style.cssText = `flex:1;height:100%;background-color:${this._segColor('empty', false)}`;
      bar.appendChild(seg);
    }
  }

  private _segColor(status: FrameStatus, isCurrent: boolean): string {
    const d = this._isDark;
    const map = d
      ? { empty: '#444', loading: '#aa7700', loaded: 'steelblue', failed: '#aa1111',
          cur_empty: '#666', cur_loading: '#cc9900', cur_loaded: '#6baed6', cur_failed: '#cc3333' }
      : { empty: '#e0e0e0', loading: '#ffcc00', loaded: '#ccf2ff', failed: '#ff4444',
          cur_empty: '#c0c0c0', cur_loading: '#ffe566', cur_loaded: '#66d9ff', cur_failed: '#ff8888' };
    return isCurrent ? ((map as any)[`cur_${status}`] ?? map.cur_empty) : ((map as any)[status] ?? map.empty);
  }

  private _setSegmentStatus(fi: number, status: FrameStatus): void {
    this._frameStatuses[fi] = status;
    const seg = this.shadowRoot?.getElementById(`seg-${fi}`);
    if (seg) seg.style.backgroundColor = this._segColor(status, false);
  }

  private _highlightCurrentFrame(fi: number): void {
    for (let j = 0; j < this._configFrameCount; j++) {
      const seg = this.shadowRoot?.getElementById(`seg-${j}`);
      if (seg) seg.style.backgroundColor = this._segColor(this._frameStatuses[j] ?? 'empty', j === fi);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Animation timing helpers
  // ───────────────────────────────────────────────────────────────────────────

  private get _timeout(): number { return this._config.frame_delay ?? 500; }
  private get _restartDelay(): number { return this._config.restart_delay ?? 1000; }
  private get _fadeMs(): number {
    const animated = this._config.animated_transitions !== false;
    if (!animated) return 0;
    return this._config.transition_time !== undefined
      ? this._config.transition_time
      : Math.floor(this._timeout * 0.4);
  }

  private _getAnimElapsed(): number {
    const now = performance.now();
    const pending = this._animPauseStartTime ? (now - this._animPauseStartTime) : 0;
    return now - this._animStartWallTime - this._animAccPauseMs - pending;
  }

  private _pauseAnimations(): void {
    if (this._animPauseStartTime) return;
    this._animPauseStartTime = performance.now();
    this._setAnimPlayState('paused');
  }

  private _resumeAnimations(): void {
    if (this._animPauseStartTime) {
      this._animAccPauseMs += performance.now() - this._animPauseStartTime;
      this._animPauseStartTime = null;
    }
    this._setAnimPlayState('running');
  }

  private _setAnimPlayState(state: 'paused' | 'running'): void {
    for (const layer of this._radarImage) {
      if (!layer) continue;
      const el = (layer as any).getContainer?.() as HTMLElement | undefined;
      if (el) el.style.animationPlayState = state;
    }
  }

  private _setLayerZIndex(layer: L.TileLayer, z: number): void {
    const el = (layer as any).getContainer?.() as HTMLElement | undefined;
    if (el) el.style.zIndex = String(z);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Dynamic CSS keyframes
  // ───────────────────────────────────────────────────────────────────────────

  private _buildSlotKeyframes(n: number): string {
    if (n === 0) return '';
    const totalMs = n * this._timeout + this._restartDelay;
    const halfFade = Math.floor(this._fadeMs / 2);
    const pct = (ms: number): string => `${((ms / totalMs) * 100).toFixed(4)}%`;
    let css = '';
    for (let slot = 0; slot < n; slot++) {
      const slotStart = slot * this._timeout;
      const slotEnd = (slot + 1) * this._timeout;
      css += `@keyframes radar-slot-${slot} {`;
      if (halfFade === 0) {
        css += slot === 0 ? '0%{opacity:1}' : `0%{opacity:0}${pct(slotStart)}{opacity:1}`;
        css += slot === n - 1 ? '99.9999%{opacity:1}100%{opacity:0}' : `${pct(slotEnd)}{opacity:0}100%{opacity:0}`;
      } else {
        const fi = slotStart - halfFade;
        const fo = slotEnd + halfFade;
        if (slot === 0) {
          css += '0%{opacity:1}';
        } else {
          css += `${fi > 0 ? pct(fi) : '0%'}{opacity:0}${pct(slotStart)}{opacity:1}`;
        }
        if (slot === n - 1) {
          css += `${pct(slotEnd)}{opacity:1}99.9999%{opacity:1}100%{opacity:0}`;
        } else {
          css += `${pct(slotEnd)}{opacity:1}${pct(Math.min(fo, n * this._timeout))}{opacity:0}100%{opacity:0}`;
        }
      }
      css += '} ';
    }
    return css;
  }

  private _applyAnimations(): void {
    const n = this._loadedSlots.length;
    if (n === 0) return;
    const totalMs = n * this._timeout + this._restartDelay;
    const wasPaused = this._animPauseStartTime !== null;
    this._animStartWallTime = performance.now();
    this._animAccPauseMs = 0;
    this._animPauseStartTime = null;
    this._dynamicStyleEl.textContent = this._buildSlotKeyframes(n);

    const timing = this._fadeMs === 0 ? 'step-end' : 'linear';
    for (let fi = 0; fi < this._configFrameCount; fi++) {
      const layer = this._radarImage[fi];
      const el = layer && (layer as any).getContainer?.() as HTMLElement | undefined;
      if (!el) continue;
      const slot = this._loadedSlots.indexOf(fi);
      if (slot === -1) {
        el.style.animation = 'none';
        el.style.opacity = '0';
      } else {
        el.style.opacity = '0';
        el.style.animation = `radar-slot-${slot} ${totalMs}ms ${timing} infinite`;
      }
    }
    if (wasPaused) {
      this._animPauseStartTime = performance.now();
      this._setAnimPlayState('paused');
    }
  }

  private _seekToFrame(targetSlot: number): void {
    const n = this._loadedSlots.length;
    if (n === 0) return;
    const totalMs = n * this._timeout + this._restartDelay;
    const seekMs = targetSlot * this._timeout;
    const wasPaused = this._animPauseStartTime !== null;
    this._animStartWallTime = performance.now() - seekMs;
    this._animAccPauseMs = 0;
    this._animPauseStartTime = null;
    const timing = this._fadeMs === 0 ? 'step-end' : 'linear';
    for (let slot = 0; slot < n; slot++) {
      const fi = this._loadedSlots[slot];
      const el = this._radarImage[fi] && (this._radarImage[fi] as any).getContainer?.() as HTMLElement | undefined;
      if (el) {
        el.style.animation = 'none';
        void el.offsetHeight; // force reflow
        el.style.animation = `radar-slot-${slot} ${totalMs}ms ${timing} -${seekMs}ms infinite`;
      }
    }
    if (wasPaused) {
      this._animPauseStartTime = performance.now();
      this._setAnimPlayState('paused');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UI updater
  // ───────────────────────────────────────────────────────────────────────────

  private _startUIUpdater(gen: number): void {
    const tick = (): void => {
      if (gen !== this._frameGeneration) return;
      const n = this._loadedSlots.length;
      if (n === 0) { setTimeout(tick, this._timeout); return; }
      const totalMs = n * this._timeout + this._restartDelay;
      const elapsed = this._getAnimElapsed() % totalMs;
      const slot = Math.min(Math.floor(elapsed / this._timeout), n - 1);
      const fi = this._loadedSlots[slot];
      if (fi !== undefined) {
        const ts = this.shadowRoot?.getElementById('timestamp');
        if (ts) ts.textContent = this._radarTime[fi] ?? '';
        this._highlightCurrentFrame(fi);
      }
      const msIntoSlot = elapsed % this._timeout;
      setTimeout(tick, this._timeout - msIntoSlot + 10);
    };
    tick();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Radar data fetching
  // ───────────────────────────────────────────────────────────────────────────

  private async _fetchRadarPaths(): Promise<RadarFrame[]> {
    const dataSource = this._config.data_source ?? 'RainViewer';
    if (dataSource === 'NOAA') {
      const now = Date.now();
      const lag = 15 * 60 * 1000;
      const step = 5 * 60 * 1000;
      const snap = Math.trunc((now - lag) / step) * step;
      const frames: RadarFrame[] = [];
      for (let i = this._configFrameCount - 1; i >= 0; i--) {
        frames.unshift({ time: (snap - i * step) / 1000, path: '' });
      }
      return frames;
    }

    // RainViewer — path already contains /v2/radar/<id>, host is in the response
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await res.json();
    const host: string = data.host ?? 'https://tilecache.rainviewer.com';
    const past: RadarFrame[] = (data?.radar?.past ?? []).map((f: any) => ({ time: f.time, path: f.path, host }));
    const maxFrames = 13;
    return past.slice(-Math.min(this._configFrameCount, maxFrames));
  }

  private _createRadarLayer(frame: RadarFrame): FetchTileLayer | FetchWmsTileLayer {
    const dataSource = this._config.data_source ?? 'RainViewer';

    if (dataSource === 'NOAA') {
      const isoTime = new Date(frame.time * 1000).toISOString().split('.')[0] + 'Z';
      return new FetchWmsTileLayer(NOAA_WMS_URL, {
        layers: NOAA_WMS_LAYER,
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        TIME: isoTime,
        opacity: 0,
        maxNativeZoom: 7,
        rateLimiter: this._noaaLimiter,
      } as any);
    }

    // path is e.g. /v2/radar/a8183d857150 — prepend the CDN host from the API response.
    // 512px tiles with color=255 and options=1_1_1_0 (smooth, snow, labels, 0) are the
    // current working format. zoomOffset:-1 compensates for the doubled tile size.
    const host = frame.host ?? 'https://tilecache.rainviewer.com';
    const tileURL = `${host}${frame.path}/512/{z}/{x}/{y}/255/1_1_1_0.png`;
    return new FetchTileLayer(tileURL, {
      detectRetina: false,
      tileSize: 512,
      zoomOffset: -1,
      opacity: 0,
      maxNativeZoom: 7,
      rateLimiter: this._rainviewerLimiter,
    } as any);
  }

  private _getRadarTimeString(epochMs: number): string {
    const d = new Date(epochMs);
    const pad = (n: number): string => String(n).padStart(2, '0');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Radar init
  // ───────────────────────────────────────────────────────────────────────────

  private _clearRadarLayers(): void {
    this._frameGeneration++;
    this._radarReady = false;
    for (const layer of this._radarImage) {
      if (layer && (layer as any).remove) (layer as any).remove();
    }
    this._radarImage = [];
    this._radarTime = [];
    this._loadedSlots = [];
  }

  private async _initRadar(): Promise<void> {
    if (!this._map) return;
    const pastFrames = await this._fetchRadarPaths();
    this._radarPaths = pastFrames;
    const frameCount = pastFrames.length;
    this._configFrameCount = frameCount;
    const myGen = this._frameGeneration;
    this._loadedSlots = [];

    this._buildProgressSegments();

    // Show colour bar
    const dataSource = this._config.data_source ?? 'RainViewer';
    const colourBar = this.shadowRoot?.getElementById('color-bar');
    const colourImg = this.shadowRoot?.getElementById('img-color-bar') as HTMLImageElement | null;
    if (colourBar && colourImg) {
      if (dataSource === 'NOAA') {
        colourBar.style.display = 'none';
      } else {
        colourImg.src = `${ICON_BASE}radar-colour-bar-universalblue.png`;
      }
    }

    let newestShown = false;
    let uiStarted = false;

    for (let fi = frameCount - 1; fi >= 0; fi--) {
      if (myGen !== this._frameGeneration || !this._map) return;

      this._setSegmentStatus(fi, 'loading');
      const layer = this._createRadarLayer(this._radarPaths[fi]);
      this._radarImage[fi] = layer;
      this._radarTime[fi] = this._getRadarTimeString(this._radarPaths[fi].time * 1000);
      layer.addTo(this._map);
      this._setLayerZIndex(layer, fi + 1);
      const el = (layer as any).getContainer?.() as HTMLElement | undefined;
      if (el) el.style.opacity = '0';

      const status = await layerSettled(layer);
      if (myGen !== this._frameGeneration) return;

      this._setSegmentStatus(fi, status);

      if (status === 'loaded') {
        this._loadedSlots.unshift(fi);

        if (!newestShown) {
          newestShown = true;
          const frameEl = (layer as any).getContainer?.() as HTMLElement | undefined;
          if (frameEl) frameEl.style.opacity = '1';
          const ts = this.shadowRoot?.getElementById('timestamp');
          if (ts) ts.textContent = this._radarTime[fi];
          this._highlightCurrentFrame(fi);
        }

        if (this._loadedSlots.length >= 2) {
          this._radarReady = true;
          this._applyAnimations();
          if (!uiStarted) { uiStarted = true; this._startUIUpdater(myGen); }
        }
      } else {
        for (let j = fi - 1; j >= 0; j--) this._setSegmentStatus(j, 'failed');
        break;
      }
    }

    if (myGen !== this._frameGeneration) return;
    if (this._loadedSlots.length > 0) {
      this._radarReady = true;
      if (!uiStarted) this._startUIUpdater(myGen);
      this._setUpdateTimeout();
    }
  }

  private _setUpdateTimeout(): void {
    const framePeriod = 300_000;
    const frameLag = (this._config.data_source ?? 'RainViewer') === 'NOAA' ? 0 : 60_000;
    this._workerTimeout(() => {
      if (this._radarReady && !this._navPaused && !this._viewPaused) {
        this._updateRadar();
      } else {
        this._doRadarUpdate = true;
      }
    }, framePeriod + frameLag);
  }

  private async _updateRadar(): Promise<void> {
    if (!this._map) return;
    const pastFrames = await this._fetchRadarPaths();
    const latestFrame = pastFrames[pastFrames.length - 1];
    const frameCount = this._configFrameCount;

    const newLayer = this._createRadarLayer(latestFrame);
    newLayer.addTo(this._map);
    const newTime = this._getRadarTimeString(latestFrame.time * 1000);

    this._radarImage[0]?.remove();
    for (let i = 0; i < frameCount - 1; i++) {
      this._radarImage[i] = this._radarImage[i + 1];
      this._radarTime[i] = this._radarTime[i + 1];
      this._frameStatuses[i] = this._frameStatuses[i + 1];
    }
    this._radarImage[frameCount - 1] = newLayer;
    this._radarTime[frameCount - 1] = newTime;

    // Shift loadedSlots
    this._loadedSlots = this._loadedSlots.map(fi => fi - 1).filter(fi => fi >= 0);

    // Shift segment colours
    for (let i = 0; i < frameCount - 1; i++) {
      const seg = this.shadowRoot?.getElementById(`seg-${i}`);
      if (seg) seg.style.backgroundColor = this._segColor(this._frameStatuses[i] ?? 'empty', false);
    }
    this._setSegmentStatus(frameCount - 1, 'loading');

    newLayer.once('load', () => {
      for (let i = 0; i < frameCount; i++) {
        const l = this._radarImage[i];
        if (l) this._setLayerZIndex(l, i + 1);
      }
      const newStatus: FrameStatus = newLayer._tileFailed > 0 ? 'failed' : 'loaded';
      this._setSegmentStatus(frameCount - 1, newStatus);
      if (newStatus === 'loaded') this._loadedSlots.push(frameCount - 1);
      this._applyAnimations();
    });

    this._doRadarUpdate = false;
    this._setUpdateTimeout();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Coordinate helpers (unchanged from v2)
  // ───────────────────────────────────────────────────────────────────────────

  private _validateCssSize(value: string): boolean {
    return /^\d+(\.\d+)?(px|%|em|rem|vh|vw)$/.test(value);
  }

  private _calculateHeight(): string {
    const cfg = this._config;
    if (cfg.height && this._validateCssSize(cfg.height)) return cfg.height;
    if (this.isPanel) return '100%';
    if (cfg.square_map) {
      const w = cfg.width && this._validateCssSize(cfg.width) ? cfg.width : '100%';
      return w;
    }
    return '400px';
  }

  private _isMobileDevice(): boolean {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('home assistant') || window.innerWidth <= 768 || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  }

  private _getCurrentUserInfo(): { personEntity: string; deviceTracker?: string } | null {
    const userId = this.hass?.user?.id;
    if (!userId) return null;
    for (const [entityId, state] of Object.entries(this.hass?.states || {})) {
      if (entityId.startsWith('person.') && state.attributes?.user_id === userId) {
        const trackers = state.attributes?.device_trackers;
        const deviceTracker = Array.isArray(trackers) ? trackers[0] : typeof trackers === 'string' ? trackers.split(',')[0].trim() : undefined;
        return { personEntity: entityId, deviceTracker };
      }
    }
    return null;
  }

  private _getCoordinateConfig(
    baseConfig: CoordinateConfig | undefined,
    mobileConfig?: CoordinateConfig | undefined,
    isMobile?: boolean,
    userDeviceTracker?: string,
  ): CoordinateConfig | undefined {
    if (isMobile && mobileConfig !== undefined) return mobileConfig;
    if (isMobile && !baseConfig && userDeviceTracker) return userDeviceTracker;
    return baseConfig;
  }

  private _resolveCoordinate(config: CoordinateConfig | undefined, coordType: 'latitude' | 'longitude', fallback: number): number {
    if (config === undefined || config === null) return fallback;
    if (typeof config === 'number') return config;
    if (typeof config === 'string') {
      const entity = this.hass?.states[config];
      const val = entity?.attributes?.[coordType];
      return val !== undefined ? parseFloat(val) || fallback : fallback;
    }
    if (typeof config === 'object' && 'entity' in config) {
      const attr = coordType === 'latitude' ? (config.latitude_attribute || 'latitude') : (config.longitude_attribute || 'longitude');
      const entity = this.hass?.states[config.entity];
      const val = entity?.attributes?.[attr];
      return val !== undefined ? parseFloat(val) || fallback : fallback;
    }
    return fallback;
  }

  private _resolveCoordinatePair(
    latConfig: CoordinateConfig | undefined,
    lonConfig: CoordinateConfig | undefined,
    fallbackLat: number,
    fallbackLon: number,
  ): { lat: number; lon: number } {
    if (typeof latConfig === 'string' && typeof lonConfig === 'string' && latConfig === lonConfig) {
      const entity = this.hass?.states[latConfig];
      if (entity?.attributes?.latitude && entity?.attributes?.longitude) {
        const lat = parseFloat(entity.attributes.latitude);
        const lon = parseFloat(entity.attributes.longitude);
        if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
      }
    }
    return {
      lat: this._resolveCoordinate(latConfig, 'latitude', fallbackLat),
      lon: this._resolveCoordinate(lonConfig, 'longitude', fallbackLon),
    };
  }

  private _getMarkerIconConfig(
    isMobile: boolean,
    userInfo: { personEntity: string; deviceTracker?: string } | null,
  ): { type: string; entity?: string } {
    const iconType = isMobile ? (this._config.mobile_marker_icon ?? 'entity_picture') : (this._config.marker_icon || 'default');
    let iconEntity = isMobile ? this._config.mobile_marker_icon_entity : this._config.marker_icon_entity;
    if (iconType === 'entity_picture' && !iconEntity) {
      const latCfg = isMobile ? (this._config.mobile_marker_latitude ?? this._config.marker_latitude) : this._config.marker_latitude;
      if (typeof latCfg === 'string') iconEntity = this._resolveToPersonEntity(latCfg);
      if (!iconEntity) {
        const cLat = isMobile ? (this._config.mobile_center_latitude ?? this._config.center_latitude) : this._config.center_latitude;
        if (typeof cLat === 'string') iconEntity = this._resolveToPersonEntity(cLat);
      }
      if (!iconEntity && userInfo?.personEntity) iconEntity = userInfo.personEntity;
    }
    return { type: iconType, entity: iconEntity };
  }

  private _resolveEntityPicture(entityId: string | undefined): string | null {
    if (!entityId) return null;
    return this.hass?.states[entityId]?.attributes?.entity_picture ?? null;
  }

  private _findPersonEntityForDeviceTracker(deviceTrackerId: string): string | undefined {
    for (const [entityId, state] of Object.entries(this.hass?.states || {})) {
      if (!entityId.startsWith('person.')) continue;
      const trackers = state.attributes?.device_trackers;
      if (Array.isArray(trackers) && trackers.includes(deviceTrackerId)) return entityId;
    }
    return undefined;
  }

  private _resolveToPersonEntity(entityId: string): string {
    if (entityId.startsWith('device_tracker.')) return this._findPersonEntityForDeviceTracker(entityId) ?? entityId;
    return entityId;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MDI icon paths
  // ───────────────────────────────────────────────────────────────────────────

  private static readonly MDI_PATHS: Record<string, string> = {
    account: 'M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z',
    'account-circle': 'M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
    'map-marker': 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z',
    home: 'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z',
    car: 'M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z',
    cellphone: 'M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z',
    'home-circle': 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M10,17V13H8L12,7L16,13H14V17H10Z',
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Styles
  // ───────────────────────────────────────────────────────────────────────────

  static styles = [
    unsafeCSS(leafletCss),
    css`
      :host {
        display: block;
      }
      ha-card {
        overflow: hidden;
        position: relative;
      }
      #mapid {
        width: 100%;
        position: relative;
      }
      .nav-banner {
        position: absolute;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        background: rgba(0,0,0,0.65);
        color: #fff;
        padding: 4px 12px;
        border-radius: 4px;
        font: 12px/1.5 'Helvetica Neue', Arial, sans-serif;
        pointer-events: none;
        white-space: nowrap;
      }
      .marker-entity-picture {
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        object-fit: cover;
      }
      .marker-mdi-icon {
        background: none;
        border: none;
      }
      .radar-toolbar {
        background: white;
        border-radius: 4px;
      }
      .radar-toolbar li {
        list-style: none;
      }
      /* Leaflet drag cursor fix for shadow DOM */
      :host(.leaflet-drag-target),
      :host(.leaflet-drag-target) * {
        cursor: move !important;
        cursor: grabbing !important;
      }
      /* Attribution links */
      .light-links a { color: #0078a8; }
      .dark-links a { color: #88ccff; }
      #bottom-container {
        font-size: 10px;
        position: relative;
      }
      /* Scale control text in dark mode */
      .radar-dark .leaflet-control-scale-line {
        color: #bbb;
        border-color: #bbb;
        background: rgba(0,0,0,0.5);
      }
    `,
  ];
}
