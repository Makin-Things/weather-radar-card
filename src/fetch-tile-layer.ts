/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-this-alias */
import * as L from 'leaflet';
import { RateLimiter } from './rate-limiter';

const TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export interface FetchTileOptions extends L.TileLayerOptions {
  rateLimiter?: RateLimiter;
  maxRetries?: number;
  retryDelay?: number;
  on429?: () => void;
  /** When true, Leaflet's _updateOpacity is suppressed so CSS animations own opacity. */
  animationOwnsOpacity?: boolean;
}

// Augment Leaflet's Coords type (it's missing `z` in some @types versions)
interface Coords extends L.Point {
  z: number;
}

function createFetchTile(
  this: FetchTileLayer | FetchWmsTileLayer,
  coords: Coords,
  done: L.DoneCallback,
): HTMLElement {
  const layer = this;
  const tile = document.createElement('img');
  tile.setAttribute('role', 'presentation');

  const url = layer.getTileUrl(coords);
  const opts = layer.options as FetchTileOptions;
  const maxRetries = opts.maxRetries ?? 3;
  const retryDelay = opts.retryDelay ?? 500;
  const limiter = opts.rateLimiter;
        const on429 = opts.on429;
  let attempt = 0;

  layer._tilePending++;

  const fail = (): void => {
    tile.src = TRANSPARENT;
    layer._tilePending--;
    layer._tileFailed++;
    done(undefined, tile);
  };

  const tryFetch = (): void => {
    if (limiter && !limiter.canFetch(url)) {
      setTimeout(tryFetch, limiter.msUntilSlot());
      return;
    }
    limiter?.record(url);

    fetch(url, { referrer: window.location.href, referrerPolicy: 'no-referrer-when-downgrade' })
      .then((r) => {
        if (r.status === 404) { const e: any = new Error('404'); e.status = 404; throw e; }
        if (r.status === 429) { const e: any = new Error('429'); e.status = 429; throw e; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        const objUrl = URL.createObjectURL(blob);
        tile.onload = () => URL.revokeObjectURL(objUrl);
        tile.src = objUrl;
        limiter?.recordSuccess(url);
        layer._tilePending--;
        layer._tileLoaded++;
        done(undefined, tile);
      })
      .catch((err: any) => {
        if (err.status === 404) {
          fail();
        } else if (err.status === 429 || (limiter && !err.status)) {
          // 429 with CORS headers sets err.status; without CORS headers the browser
          // blocks the response entirely, leaving err.status undefined. If we have a
          // rate limiter on this source, treat any statusless error as rate-limited.
          on429?.();
          const wait = limiter ? Math.max(limiter.msUntilSlot(), 1000) : 5000;
          setTimeout(tryFetch, wait);
        } else if (++attempt < maxRetries) {
          setTimeout(tryFetch, retryDelay * attempt);
        } else {
          fail();
        }
      });
  };

  tryFetch();
  return tile;
}

export class FetchTileLayer extends L.TileLayer {
  _tilePending = 0;
  _tileFailed = 0;
  _tileLoaded = 0;

  initialize(url: string, options: FetchTileOptions): void {
    this._tilePending = 0;
    this._tileFailed = 0;
    this._tileLoaded = 0;
    (L.TileLayer.prototype as any).initialize.call(this, url, options);
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    return createFetchTile.call(this, coords as Coords, done);
  }

  // Leaflet's _updateOpacity (a) writes container.style.opacity, fighting our CSS
  // animation, and (b) fades individual tile <img> elements from 0→1 over 200ms.
  // When animationOwnsOpacity is set we skip (a) but still do (b) — otherwise
  // every tile stays at opacity:0 permanently.
  _updateOpacity(): void {
    if (!(this.options as FetchTileOptions).animationOwnsOpacity) {
      (L.TileLayer.prototype as any)._updateOpacity?.call(this);
      return;
    }
    // Set each tile img to fully visible (bypass the 200ms fade-in).
    const tiles = (this as any)._tiles as Record<string, { el: HTMLElement }> | undefined;
    if (tiles) {
      for (const key in tiles) {
        const tile = tiles[key];
        if (tile?.el) tile.el.style.opacity = '1';
      }
    }
    // Also ensure tile-container divs are visible (CSS starts them at opacity:0).
    const container = (this as any)._container as HTMLElement | undefined;
    if (container) {
      container.querySelectorAll<HTMLElement>('.leaflet-tile-container').forEach(
        (el) => { el.style.opacity = '1'; },
      );
    }
  }
}

export class FetchWmsTileLayer extends L.TileLayer.WMS {
  _tilePending = 0;
  _tileFailed = 0;
  _tileLoaded = 0;

  initialize(url: string, options: L.WMSOptions & FetchTileOptions): void {
    this._tilePending = 0;
    this._tileFailed = 0;
    this._tileLoaded = 0;
    (L.TileLayer.WMS.prototype as any).initialize.call(this, url, options);
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    return createFetchTile.call(this as any, coords as Coords, done);
  }

  _updateOpacity(): void {
    if (!(this.options as FetchTileOptions).animationOwnsOpacity) {
      (L.TileLayer.WMS.prototype as any)._updateOpacity?.call(this);
      return;
    }
    const tiles = (this as any)._tiles as Record<string, { el: HTMLElement }> | undefined;
    if (tiles) {
      for (const key in tiles) {
        const tile = tiles[key];
        if (tile?.el) tile.el.style.opacity = '1';
      }
    }
    const container = (this as any)._container as HTMLElement | undefined;
    if (container) {
      container.querySelectorAll<HTMLElement>('.leaflet-tile-container').forEach(
        (el) => { el.style.opacity = '1'; },
      );
    }
  }
}

export function layerSettled(layer: FetchTileLayer | FetchWmsTileLayer): Promise<'loaded' | 'failed'> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      layer.off('load', onLoad);
      resolve('failed');
    }, 90_000);

    const onLoad = () => {
      clearTimeout(timer);
      resolve(layer._tileFailed > 0 ? 'failed' : 'loaded');
    };

    layer.once('load', onLoad);
  });
}
