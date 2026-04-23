/* eslint-disable @typescript-eslint/no-unused-vars */
import * as L from 'leaflet';

const ICON_BASE = '/local/community/weather-radar-card/';

export interface RadarToolbarOptions {
  showRecenter: boolean;
  showPlayback: boolean;
  onRecenter?: () => void;
  onPlay?: () => void;
  onSkipBack?: () => void;
  onSkipNext?: () => void;
}

/**
 * Simple Leaflet control that replaces Leaflet.Toolbar2 for v3.
 * Renders recenter, play/pause, skip-back, skip-next buttons as a standard
 * Leaflet bar control positioned at bottom-right.
 */
export class RadarToolbar extends L.Control {
  private _opts: RadarToolbarOptions;
  private _playBtn: HTMLImageElement | null = null;
  private _playing = true;

  constructor(opts: RadarToolbarOptions) {
    super({ position: 'bottomright' });
    this._opts = opts;
  }

  onAdd(_map: L.Map): HTMLElement {
    const bar = L.DomUtil.create('div', 'radar-toolbar leaflet-bar');
    L.DomEvent.disableClickPropagation(bar);

    if (this._opts.showRecenter) {
      this._addBtn(bar, `${ICON_BASE}recenter.png`, 'Re-centre', () => this._opts.onRecenter?.());
    }

    if (this._opts.showPlayback) {
      this._addBtn(bar, `${ICON_BASE}skip-back.png`, 'Previous frame', () => this._opts.onSkipBack?.());

      const playImg = this._addBtn(bar, `${ICON_BASE}pause.png`, 'Play / Pause', () => {
        this._playing = !this._playing;
        playImg.src = `${ICON_BASE}${this._playing ? 'pause' : 'play'}.png`;
        this._opts.onPlay?.();
      });
      this._playBtn = playImg;

      this._addBtn(bar, `${ICON_BASE}skip-next.png`, 'Next frame', () => this._opts.onSkipNext?.());
    }

    return bar;
  }

  /** Called by the card when playback state changes externally (e.g. skip-step). */
  setPlaying(playing: boolean): void {
    this._playing = playing;
    if (this._playBtn) {
      this._playBtn.src = `${ICON_BASE}${playing ? 'pause' : 'play'}.png`;
    }
  }

  private _addBtn(container: HTMLElement, iconSrc: string, title: string, handler: () => void): HTMLImageElement {
    const li = L.DomUtil.create('li', '', container);
    const a = L.DomUtil.create('a', 'leaflet-bar-part', li) as HTMLAnchorElement;
    a.href = '#';
    a.title = title;
    a.style.cssText = 'width:30px;height:30px;display:flex;align-items:center;justify-content:center;';
    const img = L.DomUtil.create('img', '', a) as HTMLImageElement;
    img.src = iconSrc;
    img.width = 24;
    img.height = 24;
    L.DomEvent.on(a, 'click', (e) => { L.DomEvent.preventDefault(e); handler(); });
    return img;
  }
}
