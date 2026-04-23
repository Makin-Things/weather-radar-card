/**
 * Sliding-window rate limiter with URL cache awareness.
 * Successfully fetched URLs are stored in a Set; repeat requests for the same
 * URL are assumed to be served from the browser cache and don't count against
 * the rate limit.
 */
export class RateLimiter {
  private _window: Array<{ time: number; url: string }> = [];
  private _cache = new Set<string>();

  constructor(private readonly _maxPerMinute: number) {}

  private _prune(): void {
    const cutoff = Date.now() - 60_000;
    while (this._window.length && this._window[0].time <= cutoff) {
      this._window.shift();
    }
  }

  canFetch(url: string): boolean {
    if (this._cache.has(url)) return true;
    this._prune();
    return this._window.length < this._maxPerMinute;
  }

  record(url: string): void {
    if (!this._cache.has(url)) {
      this._window.push({ time: Date.now(), url });
    }
  }

  recordSuccess(url: string): void {
    this._cache.add(url);
  }

  /** Milliseconds until the oldest window entry expires (plus 50ms buffer). */
  msUntilSlot(): number {
    this._prune();
    if (!this._window.length) return 0;
    return this._window[0].time + 60_000 - Date.now() + 50;
  }
}
