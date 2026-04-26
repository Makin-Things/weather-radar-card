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

  // Frame loop state — _loopGen is incremented to cancel in-flight timers
  private _currentSlot = 0;
  private _loopGen = 0;

  // Web worker timer (used only for the periodic 5-min radar update)
  private _worker: Worker | null = null;
  private _workerBlobUrl: string | null = null;
  private _workerCallbacks = new Map<number, () => void>();
  private _workerNextId = 0;

  // Rate-limit state
  private _rateLimitTimer: ReturnType<typeof setTimeout> | null = null;
  private _isRateLimited = false;

  // Toolbar reference (set externally after toolbar is created)
  toolbar: RadarToolbar | null = null;

  constructor(opts: RadarPlayerOptions) {
    this._map = opts.map;
    this._shadowRoot = opts.shadowRoot;
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
    this._stopLoop();
    this._clearLayers();
    if (this._rateLimitTimer) { clearTimeout(this._rateLimitTimer); this._rateLimitTimer = null; }
    this._worker?.terminate();
    this._worker = null;
    this._workerCallbacks.clear();
    if (this._workerBlobUrl) { URL.revokeObjectURL(this._workerBlobUrl); this._workerBlobUrl = null; }
  }

  // ── Navigation / visibility pause ────────────────────────────────────────

  onNavPaused(): void {
    this.navPaused = true;
    this._stopLoop();
    for (let i = 0; i < this._configFrameCount; i++) this._setSegment(i, 'empty');
    this._showRateLimitBanner(false);
  }

  async onNavSettled(frameCount: number): Promise<void> {
    this.navPaused = false;
    this._clearLayers();
    this._configFrameCount = frameCount;
    await this._initRadar();
  }

  onVisibilityHidden(): void {
    this.viewPaused = true;
    this._stopLoop();
  }

  onVisibilityVisible(): void {
    if (!this.viewPaused) return;
    this.viewPaused = false;
    if (this._doRadarUpdate && this._radarReady) {
      this._doRadarUpdate = false;
      this._updateRadar();
    } else if (this.run && this._radarReady) {
      this._startLoop();
    }
  }

  // ── Playback controls ────────────────────────────────────────────────────

  togglePlay(): void {
    this.run = !this.run;
    if (this.run) this._startLoop();
    else this._stopLoop();
  }

  get frameCount(): number { return this._configFrameCount; }

  /** Move to a specific frame index without restarting the loop timer. */
  scrubTo(fi: number): void {
    const slot = this._loadedSlots.indexOf(fi);
    if (slot === -1) return;
    this._stopLoop();
    this._currentSlot = slot;
    this._showSlot(slot);
  }

  /** Called when a scrub gesture ends — resumes playback if it was running. */
  scrubEnd(): void {
    if (this.run && !this.navPaused && !this.viewPaused) {
      this._startLoop(this._currentSlot);
    }
  }

  skipNext(): void {
    if (!this._radarReady) return;
    const n = this._loadedSlots.length;
    if (n < 2) return;
    this._currentSlot = (this._currentSlot + 1) % n;
    this._showSlot(this._currentSlot);
    this._stopLoop();
    this.run = false;
    this.toolbar?.setPlaying(false);
  }

  skipBack(): void {
    if (!this._radarReady) return;
    const n = this._loadedSlots.length;
    if (n < 2) return;
    this._currentSlot = (this._currentSlot - 1 + n) % n;
    this._showSlot(this._currentSlot);
    this._stopLoop();
    this.run = false;
    this.toolbar?.setPlaying(false);
  }

  // ── Frame loop ───────────────────────────────────────────────────────────

  private _stopLoop(): void {
    this._loopGen++;
  }

  /** Start (or restart) the frame loop, optionally jumping to a specific slot. */
  private _startLoop(startSlot?: number): void {
    this._loopGen++;
    const gen = this._loopGen;
    if (startSlot !== undefined) this._currentSlot = startSlot;
    this._showSlot(this._currentSlot);
    this._scheduleNext(gen);
  }

  private _scheduleNext(gen: number): void {
    if (!this.run || this.navPaused || this.viewPaused) return;
    const n = this._loadedSlots.length;
    if (n < 2) return;
    const delay = this._currentSlot === n - 1
      ? this._timeout + this._restartDelay
      : this._timeout;
    setTimeout(() => {
      if (gen !== this._loopGen) return;
      this._currentSlot = (this._currentSlot + 1) % this._loadedSlots.length;
      this._showSlot(this._currentSlot);
      this._scheduleNext(gen);
    }, delay);
  }

  /** Show one slot: set its container to opacity 1, all others to 0, update UI. */
  private _showSlot(slot: number): void {
    const n = this._loadedSlots.length;
    if (n === 0 || slot < 0 || slot >= n) return;
    const fade = this._fadeMs;
    const transition = fade > 0 ? `opacity ${fade}ms linear` : 'none';
    for (let s = 0; s < n; s++) {
      const fi = this._loadedSlots[s];
      const layer = this._radarImage[fi];
      const el = layer && (layer as any).getContainer?.() as HTMLElement | undefined;
      if (el) {
        el.style.transition = transition;
        el.style.opacity = s === slot ? '1' : '0';
      }
    }
    const fi = this._loadedSlots[slot];
    if (fi !== undefined) {
      const ts = this._shadowRoot.getElementById('timestamp');
      if (ts) ts.textContent = this._radarTime[fi] ?? '';
      this._highlightSegment(fi);
    }
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

  private _showRateLimitBanner(show: boolean): void {
    const banner = this._shadowRoot.getElementById('rate-limit-banner');
    if (banner) banner.style.display = show ? 'block' : 'none';
  }

  private _onRateLimited(): void {
    if (this._isRateLimited) return;
    this._isRateLimited = true;
    this._showRateLimitBanner(true);
    if (this._rateLimitTimer) clearTimeout(this._rateLimitTimer);
    this._rateLimitTimer = setTimeout(() => this._retryAfterRateLimit(), 10_000);
  }

  private _retryAfterRateLimit(): void {
    this._isRateLimited = false;
    this._rateLimitTimer = null;
    this._clearLayers();
    this._initRadar();
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
        frames.push({ time: (snap - i * step) / 1000, path: '' });
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
        maxNativeZoom: 7,
        rateLimiter: this._noaaLimiter,
        on429: () => this._onRateLimited(),
        animationOwnsOpacity: true,
      } as any);
    }
    const snow = this._cfg.show_snow ? 1 : 0;
    const host = frame.host ?? 'https://tilecache.rainviewer.com';
    return new FetchTileLayer(`${host}${frame.path}/512/{z}/{x}/{y}/2/1_${snow}.png`, {
      detectRetina: false,
      tileSize: 512,
      zoomOffset: -1,
      maxNativeZoom: 7,
      rateLimiter: this._rainviewerLimiter,
      on429: () => this._onRateLimited(),
      animationOwnsOpacity: true,
    } as any);
  }

  private _getTimeString(epochMs: number): string {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit',
    }).format(new Date(epochMs));
  }

  // ── Radar init ───────────────────────────────────────────────────────────

  private async _initRadar(): Promise<void> {
    // Increment generation before the first await so any concurrently-running
    // _initRadar call (same-gen double-start) aborts at its next gen check.
    this._stopLoop();
    this._frameGeneration++;
    const myGen = this._frameGeneration;
    this._loadedSlots = [];
    this._currentSlot = 0;

    let pastFrames: RadarFrame[];
    try {
      pastFrames = await this._fetchPaths();
    } catch {
      return; // network/parse error — card stays blank until next nav or reload
    }
    if (myGen !== this._frameGeneration) return;
    if (pastFrames.length === 0) return; // API returned no frames
    this._radarPaths = pastFrames;
    const frameCount = pastFrames.length;
    this._configFrameCount = frameCount;

    this._buildSegments();

    let newestShown = false;

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
        const prevSlotCount = this._loadedSlots.length;
        this._loadedSlots.unshift(fi);

        if (!newestShown) {
          // Show newest frame as a static preview before the loop starts
          newestShown = true;
          if (el) el.style.opacity = '1';
          const ts = this._shadowRoot.getElementById('timestamp');
          if (ts) ts.textContent = this._radarTime[fi];
          this._highlightSegment(fi);
        }

        if (this._loadedSlots.length >= 2) {
          this._radarReady = true;
          if (prevSlotCount >= 2) {
            // A new older frame was prepended; shift _currentSlot to keep the
            // same frame (newest) showing — the running timer continues unaffected.
            this._currentSlot++;
          } else {
            // Two frames ready: start the loop at the newest slot.
            this._startLoop(this._loadedSlots.length - 1);
          }
        }
      } else {
        for (let j = fi - 1; j >= 0; j--) this._setSegment(j, 'failed');
        break;
      }
    }

    if (myGen !== this._frameGeneration) return;
    if (this._loadedSlots.length > 0) {
      this._radarReady = true;
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
    const myGen = this._frameGeneration;
    let pastFrames: RadarFrame[];
    try {
      pastFrames = await this._fetchPaths();
    } catch {
      this._scheduleUpdate(); // retry on next cycle
      return;
    }
    if (myGen !== this._frameGeneration) return; // torn down while fetching
    if (pastFrames.length === 0) { this._scheduleUpdate(); return; } // no frames from API
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
      if (myGen !== this._frameGeneration) return; // torn down before tiles finished
      for (let i = 0; i < frameCount; i++) {
        const l = this._radarImage[i];
        if (l) this._setLayerZ(l, i + 1);
      }
      const newStatus: FrameStatus = newLayer._tileFailed > 0 ? 'failed' : 'loaded';
      this._setSegment(frameCount - 1, newStatus);
      if (newStatus === 'loaded') this._loadedSlots.push(frameCount - 1);
      // Restart loop at newest frame so new data shows immediately
      this._currentSlot = this._loadedSlots.length - 1;
      this._startLoop();
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
    this._workerBlobUrl = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    this._worker = new Worker(this._workerBlobUrl);
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
