/* eslint-disable @typescript-eslint/no-explicit-any */
import * as L from 'leaflet';
import { WeatherRadarCardConfig } from './types';
import { RateLimiter } from './rate-limiter';
import { FetchTileLayer, FetchWmsTileLayer, layerSettled } from './fetch-tile-layer';
import { RadarToolbar } from './radar-toolbar';

// ── Types ────────────────────────────────────────────────────────────────────

export type FrameStatus = 'empty' | 'loading' | 'loaded' | 'failed';
export interface RadarFrame { time: number; path: string; host?: string; }

const NOAA_WMS_URL =
  'https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer';
const NOAA_WMS_LAYER = 'radar_base_reflectivity_time';

export interface RadarPlayerOptions {
  map: L.Map;
  shadowRoot: ShadowRoot;
  dynamicStyleEl: HTMLStyleElement;
  getConfig: () => WeatherRadarCardConfig;
  rainviewerLimiter: RateLimiter;
  noaaLimiter: RateLimiter;
}

// ── RadarPlayer ──────────────────────────────────────────────────────────────

export class RadarPlayer {
  // Playback state (readable by card)
  run = true;
  navPaused = false;
  viewPaused = false;

  // Private radar state
  private _map: L.Map;
  private _shadowRoot: ShadowRoot;
  private _dynamicStyleEl: HTMLStyleElement;
  private _getConfig: () => WeatherRadarCardConfig;
  private _rainviewerLimiter: RateLimiter;
  private _noaaLimiter: RateLimiter;

  private _radarImage: (FetchTileLayer | FetchWmsTileLayer)[] = [];
  private _radarTime: string[] = [];
  private _radarPaths: RadarFrame[] = [];
  private _loadedSlots: number[] = [];
  private _frameStatuses: FrameStatus[] = [];
  private _radarReady = false;
  private _frameGeneration = 0;
  private _configFrameCount = 5;
  private _doRadarUpdate = false;

  // Animation state
  private _animStartWallTime = 0;
  private _animPauseStartTime: number | null = null;
  private _animAccPauseMs = 0;

  // Web worker timer
  private _worker: Worker | null = null;
  private _workerCallbacks = new Map<number, () => void>();
  private _workerNextId = 0;

  // Timers
  private _rateLimitTimer: ReturnType<typeof setTimeout> | null = null;

  // Toolbar reference (set externally after toolbar is created)
  toolbar: RadarToolbar | null = null;

  constructor(opts: RadarPlayerOptions) {
    this._map = opts.map;
    this._shadowRoot = opts.shadowRoot;
    this._dynamicStyleEl = opts.dynamicStyleEl;
    this._getConfig = opts.getConfig;
    this._rainviewerLimiter = opts.rainviewerLimiter;
    this._noaaLimiter = opts.noaaLimiter;
    this._startWorker();
  }

  // ── Config helpers ───────────────────────────────────────────────────────

  private get _cfg(): WeatherRadarCardConfig { return this._getConfig(); }
  private get _timeout(): number { return this._cfg.frame_delay ?? 500; }
  private get _restartDelay(): number { return this._cfg.restart_delay ?? 1000; }
  private get _fadeMs(): number {
    if (this._cfg.animated_transitions === false) return 0;
    return this._cfg.transition_time ?? Math.floor(this._timeout * 0.4);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** Start loading radar frames for the current map view. */
  async start(frameCount: number): Promise<void> {
    this._configFrameCount = frameCount;
    await this._initRadar();
  }

  /** Tear down all layers and cancel pending async work. */
  clear(): void {
    this._clearLayers();
    if (this._rateLimitTimer) { clearTimeout(this._rateLimitTimer); this._rateLimitTimer = null; }
    this._worker?.terminate();
    this._worker = null;
    this._workerCallbacks.clear();
  }

  // ── Navigation / visibility pause ────────────────────────────────────────

  onNavPaused(): void {
    this.navPaused = true;
    this._pauseAnimations();
    for (let i = 0; i < this._configFrameCount; i++) this._setSegment(i, 'empty');
  }

  async onNavSettled(frameCount: number): Promise<void> {
    this.navPaused = false;
    if (this.run) { this._animPauseStartTime = null; this._animAccPauseMs = 0; }
    this._clearLayers();
    this._configFrameCount = frameCount;
    await this._initRadar();
  }

  onVisibilityHidden(): void {
    this.viewPaused = true;
    this._pauseAnimations();
  }

  onVisibilityVisible(): void {
    if (!this.viewPaused) return;
    this.viewPaused = false;
    if (this._doRadarUpdate && this._radarReady) {
      this._doRadarUpdate = false;
      this._updateRadar();
    } else {
      this._resumeAnimations();
    }
  }

  // ── Playback controls ────────────────────────────────────────────────────

  togglePlay(): void {
    this.run = !this.run;
    if (this.run) this._resumeAnimations();
    else this._pauseAnimations();
  }

  skipNext(): void {
    if (!this._radarReady) return;
    const n = this._loadedSlots.length;
    if (n < 2) return;
    const elapsed = this._getElapsed() % (n * this._timeout + this._restartDelay);
    const slot = Math.min(Math.floor(elapsed / this._timeout), n - 1);
    this._seekToFrame((slot + 1) % n);
    this._pauseAnimations();
    this.run = false;
    this.toolbar?.setPlaying(false);
  }

  skipBack(): void {
    if (!this._radarReady) return;
    const n = this._loadedSlots.length;
    if (n < 2) return;
    const elapsed = this._getElapsed() % (n * this._timeout + this._restartDelay);
    const slot = Math.min(Math.floor(elapsed / this._timeout), n - 1);
    this._seekToFrame((slot - 1 + n) % n);
    this._pauseAnimations();
    this.run = false;
    this.toolbar?.setPlaying(false);
  }

  // ── Animation ─────────────────────────────────────────────────────────────

  private _getElapsed(): number {
    const now = performance.now();
    const pending = this._animPauseStartTime ? now - this._animPauseStartTime : 0;
    return now - this._animStartWallTime - this._animAccPauseMs - pending;
  }

  private _pauseAnimations(): void {
    if (this._animPauseStartTime) return;
    this._animPauseStartTime = performance.now();
    this._setPlayState('paused');
  }

  private _resumeAnimations(): void {
    if (this._animPauseStartTime) {
      this._animAccPauseMs += performance.now() - this._animPauseStartTime;
      this._animPauseStartTime = null;
    }
    this._setPlayState('running');
  }

  private _setPlayState(state: 'paused' | 'running'): void {
    for (const layer of this._radarImage) {
      if (!layer) continue;
      const el = (layer as any).getContainer?.() as HTMLElement | undefined;
      if (el) el.style.animationPlayState = state;
    }
  }

  private _applyAnimations(): void {
    const n = this._loadedSlots.length;
    if (n === 0) return;
    const totalMs = n * this._timeout + this._restartDelay;
    const wasPaused = this._animPauseStartTime !== null;
    this._animStartWallTime = performance.now();
    this._animAccPauseMs = 0;
    this._animPauseStartTime = null;
    this._dynamicStyleEl.textContent = this._buildKeyframes(n);
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
    if (wasPaused) { this._animPauseStartTime = performance.now(); this._setPlayState('paused'); }
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
        void el.offsetHeight;
        el.style.animation = `radar-slot-${slot} ${totalMs}ms ${timing} -${seekMs}ms infinite`;
      }
    }
    if (wasPaused) { this._animPauseStartTime = performance.now(); this._setPlayState('paused'); }
  }

  private _buildKeyframes(n: number): string {
    if (n === 0) return '';
    const timeout = this._timeout;
    const totalMs = n * timeout + this._restartDelay;
    const halfFade = Math.floor(this._fadeMs / 2);
    const pct = (ms: number) => `${((ms / totalMs) * 100).toFixed(4)}%`;
    let css = '';
    for (let slot = 0; slot < n; slot++) {
      const start = slot * timeout;
      const end = (slot + 1) * timeout;
      css += `@keyframes radar-slot-${slot} {`;
      if (halfFade === 0) {
        css += slot === 0 ? '0%{opacity:1}' : `0%{opacity:0}${pct(start)}{opacity:1}`;
        css += slot === n - 1
          ? '99.9999%{opacity:1}100%{opacity:0}'
          : `${pct(end)}{opacity:0}100%{opacity:0}`;
      } else {
        if (slot === 0) css += '0%{opacity:1}';
        else css += `${start - halfFade > 0 ? pct(start - halfFade) : '0%'}{opacity:0}${pct(start)}{opacity:1}`;
        if (slot === n - 1)
          css += `${pct(end)}{opacity:1}99.9999%{opacity:1}100%{opacity:0}`;
        else
          css += `${pct(end)}{opacity:1}${pct(Math.min(end + halfFade, n * timeout))}{opacity:0}100%{opacity:0}`;
      }
      css += '} ';
    }
    return css;
  }

  // ── UI updater ───────────────────────────────────────────────────────────

  private _startUIUpdater(gen: number): void {
    const tick = (): void => {
      if (gen !== this._frameGeneration) return;
      const n = this._loadedSlots.length;
      if (n === 0) { setTimeout(tick, this._timeout); return; }
      const totalMs = n * this._timeout + this._restartDelay;
      const elapsed = this._getElapsed() % totalMs;
      const slot = Math.min(Math.floor(elapsed / this._timeout), n - 1);
      const fi = this._loadedSlots[slot];
      if (fi !== undefined) {
        const ts = this._shadowRoot.getElementById('timestamp');
        if (ts) ts.textContent = this._radarTime[fi] ?? '';
        this._highlightSegment(fi);
      }
      const msIntoSlot = elapsed % this._timeout;
      setTimeout(tick, this._timeout - msIntoSlot + 10);
    };
    tick();
  }

  // ── Progress bar ─────────────────────────────────────────────────────────

  private _buildSegments(): void {
    const bar = this._shadowRoot.getElementById('div-progress-bar');
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
    const cfg = this._cfg;
    const mapStyle = cfg.map_style?.toLowerCase() ?? '';
    const dark = mapStyle === 'dark' || mapStyle === 'satellite';
    const map = dark
      ? { empty: '#444', loading: '#aa7700', loaded: 'steelblue', failed: '#aa1111',
          cur_empty: '#666', cur_loading: '#cc9900', cur_loaded: '#6baed6', cur_failed: '#cc3333' }
      : { empty: '#e0e0e0', loading: '#ffcc00', loaded: '#ccf2ff', failed: '#ff4444',
          cur_empty: '#c0c0c0', cur_loading: '#ffe566', cur_loaded: '#66d9ff', cur_failed: '#ff8888' };
    return isCurrent ? ((map as any)[`cur_${status}`] ?? map.cur_empty) : ((map as any)[status] ?? map.empty);
  }

  private _setSegment(fi: number, status: FrameStatus): void {
    this._frameStatuses[fi] = status;
    const seg = this._shadowRoot.getElementById(`seg-${fi}`);
    if (seg) seg.style.backgroundColor = this._segColor(status, false);
  }

  private _highlightSegment(fi: number): void {
    for (let j = 0; j < this._configFrameCount; j++) {
      const seg = this._shadowRoot.getElementById(`seg-${j}`);
      if (seg) seg.style.backgroundColor = this._segColor(this._frameStatuses[j] ?? 'empty', j === fi);
    }
  }

  // ── Rate limit banner ────────────────────────────────────────────────────

  private _onRateLimited(): void {
    const banner = this._shadowRoot.getElementById('rate-limit-banner');
    if (banner) banner.style.display = 'block';
    if (this._rateLimitTimer) clearTimeout(this._rateLimitTimer);
    this._rateLimitTimer = setTimeout(() => {
      const b = this._shadowRoot.getElementById('rate-limit-banner');
      if (b) b.style.display = 'none';
    }, 65_000);
  }

  // ── Layer helpers ────────────────────────────────────────────────────────

  private _setLayerZ(layer: L.TileLayer, z: number): void {
    const el = (layer as any).getContainer?.() as HTMLElement | undefined;
    if (el) el.style.zIndex = String(z);
  }

  private _clearLayers(): void {
    this._frameGeneration++;
    this._radarReady = false;
    for (const layer of this._radarImage) {
      if (layer && (layer as any).remove) (layer as any).remove();
    }
    this._radarImage = [];
    this._radarTime = [];
    this._loadedSlots = [];
  }

  // ── Radar fetching ───────────────────────────────────────────────────────

  private async _fetchPaths(): Promise<RadarFrame[]> {
    const dataSource = this._cfg.data_source ?? 'RainViewer';
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
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await res.json();
    const host: string = data.host ?? 'https://tilecache.rainviewer.com';
    const past: RadarFrame[] = (data?.radar?.past ?? []).map((f: any) => ({
      time: f.time, path: f.path, host,
    }));
    return past.slice(-Math.min(this._configFrameCount, 13));
  }

  private _createLayer(frame: RadarFrame): FetchTileLayer | FetchWmsTileLayer {
    const dataSource = this._cfg.data_source ?? 'RainViewer';
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
        on429: () => this._onRateLimited(),
      } as any);
    }
    const snow = this._cfg.show_snow ? 1 : 0;
    const host = frame.host ?? 'https://tilecache.rainviewer.com';
    return new FetchTileLayer(`${host}${frame.path}/512/{z}/{x}/{y}/2/1_${snow}.png`, {
      detectRetina: false,
      tileSize: 512,
      zoomOffset: -1,
      opacity: 0,
      maxNativeZoom: 7,
      rateLimiter: this._rainviewerLimiter,
      on429: () => this._onRateLimited(),
    } as any);
  }

  private _getTimeString(epochMs: number): string {
    const d = new Date(epochMs);
    const pad = (n: number) => String(n).padStart(2, '0');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ── Radar init ───────────────────────────────────────────────────────────

  private async _initRadar(): Promise<void> {
    const pastFrames = await this._fetchPaths();
    this._radarPaths = pastFrames;
    const frameCount = pastFrames.length;
    this._configFrameCount = frameCount;
    const myGen = this._frameGeneration;
    this._loadedSlots = [];

    this._buildSegments();

    const dataSource = this._cfg.data_source ?? 'RainViewer';
    const colourBar = this._shadowRoot.getElementById('color-bar');
    const colourImg = this._shadowRoot.getElementById('img-color-bar') as HTMLImageElement | null;
    if (colourBar && colourImg) {
      colourBar.style.display = dataSource === 'NOAA' ? 'none' : '';
      if (dataSource !== 'NOAA') colourImg.src = '/local/community/weather-radar-card/radar-colour-bar-universalblue.png';
    }

    let newestShown = false;
    let uiStarted = false;

    for (let fi = frameCount - 1; fi >= 0; fi--) {
      if (myGen !== this._frameGeneration || !this._map) return;

      this._setSegment(fi, 'loading');
      const layer = this._createLayer(this._radarPaths[fi]);
      this._radarImage[fi] = layer;
      this._radarTime[fi] = this._getTimeString(this._radarPaths[fi].time * 1000);
      layer.addTo(this._map);
      this._setLayerZ(layer, fi + 1);
      const el = (layer as any).getContainer?.() as HTMLElement | undefined;
      if (el) el.style.opacity = '0';

      const status = await layerSettled(layer);
      if (myGen !== this._frameGeneration) return;

      this._setSegment(fi, status);

      if (status === 'loaded') {
        this._loadedSlots.unshift(fi);
        if (!newestShown) {
          newestShown = true;
          const frameEl = (layer as any).getContainer?.() as HTMLElement | undefined;
          if (frameEl) frameEl.style.opacity = '1';
          const ts = this._shadowRoot.getElementById('timestamp');
          if (ts) ts.textContent = this._radarTime[fi];
          this._highlightSegment(fi);
        }
        if (this._loadedSlots.length >= 2) {
          this._radarReady = true;
          this._applyAnimations();
          if (!uiStarted) { uiStarted = true; this._startUIUpdater(myGen); }
        }
      } else {
        for (let j = fi - 1; j >= 0; j--) this._setSegment(j, 'failed');
        break;
      }
    }

    if (myGen !== this._frameGeneration) return;
    if (this._loadedSlots.length > 0) {
      this._radarReady = true;
      if (!uiStarted) this._startUIUpdater(myGen);
      this._scheduleUpdate();
    }
  }

  // ── Periodic update ──────────────────────────────────────────────────────

  private _scheduleUpdate(): void {
    const framePeriod = 300_000;
    const lag = (this._cfg.data_source ?? 'RainViewer') === 'NOAA' ? 0 : 60_000;
    this._workerTimeout(() => {
      if (this._radarReady && !this.navPaused && !this.viewPaused) {
        this._updateRadar();
      } else {
        this._doRadarUpdate = true;
      }
    }, framePeriod + lag);
  }

  private async _updateRadar(): Promise<void> {
    if (!this._map) return;
    const pastFrames = await this._fetchPaths();
    const latestFrame = pastFrames[pastFrames.length - 1];
    const frameCount = this._configFrameCount;

    const newLayer = this._createLayer(latestFrame);
    newLayer.addTo(this._map);
    const newTime = this._getTimeString(latestFrame.time * 1000);

    this._radarImage[0]?.remove();
    for (let i = 0; i < frameCount - 1; i++) {
      this._radarImage[i] = this._radarImage[i + 1];
      this._radarTime[i] = this._radarTime[i + 1];
      this._frameStatuses[i] = this._frameStatuses[i + 1];
    }
    this._radarImage[frameCount - 1] = newLayer;
    this._radarTime[frameCount - 1] = newTime;
    this._loadedSlots = this._loadedSlots.map(fi => fi - 1).filter(fi => fi >= 0);

    for (let i = 0; i < frameCount - 1; i++) {
      const seg = this._shadowRoot.getElementById(`seg-${i}`);
      if (seg) seg.style.backgroundColor = this._segColor(this._frameStatuses[i] ?? 'empty', false);
    }
    this._setSegment(frameCount - 1, 'loading');

    newLayer.once('load', () => {
      for (let i = 0; i < frameCount; i++) {
        const l = this._radarImage[i];
        if (l) this._setLayerZ(l, i + 1);
      }
      const newStatus: FrameStatus = newLayer._tileFailed > 0 ? 'failed' : 'loaded';
      this._setSegment(frameCount - 1, newStatus);
      if (newStatus === 'loaded') this._loadedSlots.push(frameCount - 1);
      this._applyAnimations();
    });

    this._doRadarUpdate = false;
    this._scheduleUpdate();
  }

  // ── Web worker timer ─────────────────────────────────────────────────────

  private _startWorker(): void {
    const code = `
      var t={};
      self.onmessage=function(e){
        if(e.data.type==='setTimeout'){
          t[e.data.id]=setTimeout(function(){delete t[e.data.id];self.postMessage({type:'timeout',id:e.data.id});},e.data.delay);
        } else if(e.data.type==='clearTimeout'){
          clearTimeout(t[e.data.id]);delete t[e.data.id];
        }
      };
    `;
    this._worker = new Worker(URL.createObjectURL(new Blob([code], { type: 'application/javascript' })));
    this._worker.onmessage = (e) => {
      const cb = this._workerCallbacks.get(e.data.id);
      if (cb) { this._workerCallbacks.delete(e.data.id); cb(); }
    };
  }

  private _workerTimeout(cb: () => void, delay: number): void {
    if (!this._worker) { setTimeout(cb, delay); return; }
    const id = this._workerNextId++;
    this._workerCallbacks.set(id, cb);
    this._worker.postMessage({ type: 'setTimeout', id, delay });
  }
}
