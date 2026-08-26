// Tests for _afterFrameInserted / _markRemainingFailed — the init-loop
// bootstrap logic extracted while fixing issue #246 (radar init loaded the
// farthest-future forecast frame before "now" for forecast-heavy configs).
//
// Frames no longer always load in strict newest-to-oldest order (see
// buildLoadOrder), so a newly-loaded frame can land at any position in
// _loadedSlots, not just the front — these tests exercise the real
// position-aware bootstrap/shift logic directly, rather than hand-copying
// it into the test (the anti-pattern this repo hit in PR #216).
//
// Follows the "stub Leaflet, test the helpers" convention.

import { describe, it, expect, vi } from 'vitest';

vi.mock('leaflet', () => {
  class Layer {}
  class TileLayer {}
  class WMS {}
  (TileLayer as unknown as { WMS: typeof WMS }).WMS = WMS;
  class Control {
    constructor(_opts?: unknown) { void _opts; }
  }
  const DomUtil = { create: vi.fn(() => ({ style: {}, classList: { add: vi.fn() } })) };
  const DomEvent = { disableClickPropagation: vi.fn(), on: vi.fn() };
  return {
    Layer, TileLayer, Control, DomUtil, DomEvent,
    default: { Layer, TileLayer, Control, DomUtil, DomEvent },
  };
});

import { RadarPlayer } from '../src/radar-player';
import type { WeatherRadarCardConfig } from '../src/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makePlayer(): RadarPlayer {
  const map = {
    on: vi.fn(),
    off: vi.fn(),
    getZoom: () => 7,
    getSize: () => ({ x: 600, y: 400 }),
    getPane: vi.fn(),
    createPane: vi.fn(() => ({ style: {} })),
    getContainer: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0 }) }),
  } as any;
  const shadowRoot = { getElementById: () => null, host: {} } as any;
  return new RadarPlayer({
    map,
    shadowRoot,
    getConfig: () => ({ type: 'custom:weather-radar-card' } as WeatherRadarCardConfig),
    rainviewerLimiter: {} as any,
    noaaLimiter: {} as any,
    dwdLimiter: {} as any,
  });
}

describe('_afterFrameInserted', () => {
  it('does nothing until 2 frames are loaded', () => {
    const p = makePlayer() as any;
    p._startLoop = vi.fn();
    p._loadedSlots = [3];
    p._afterFrameInserted(0);
    expect(p._radarReady).toBe(false);
    expect(p._startLoop).not.toHaveBeenCalled();
  });

  it('starts the loop at "now"\'s position the first time 2 frames are ready', () => {
    const p = makePlayer() as any;
    p._startLoop = vi.fn();
    p._loadedSlots = [2, 3]; // second frame (index 2) just inserted ahead of the first (3)
    p._nowFrameIndex = 3;
    p._afterFrameInserted(0); // insertPos=0; _loadedSlots.length-1 (1) < 2 -> "first time reaching 2" branch
    expect(p._startLoop).toHaveBeenCalledWith(1); // position of nowFrameIndex(3) in [2, 3]
    expect(p._radarReady).toBe(true);
  });

  it('shifts _currentSlot/_prev1Slot when the new frame inserts at or before their position', () => {
    const p = makePlayer() as any;
    p._loadedSlots = [1, 2, 4]; // a frame was just inserted at position 1 (value 2)
    // _currentSlot/_prev1Slot are always equal outside _afterFrameInserted's
    // own execution (_showSlot keeps them in sync) — before this insert,
    // position 1 (value 4) was current.
    p._currentSlot = 1;
    p._prev1Slot = 1;
    p._afterFrameInserted(1); // insertPos=1; _loadedSlots.length-1 (2) >= 2 -> shift branch
    expect(p._currentSlot).toBe(2); // 1 <= 1 -> shifted
    expect(p._prev1Slot).toBe(2);  // 1 <= 1 -> shifted
  });

  it('does not shift _currentSlot/_prev1Slot when the new frame inserts after their position', () => {
    const p = makePlayer() as any;
    p._loadedSlots = [0, 1, 3]; // a frame was just inserted at the tail, position 2 (value 3)
    p._currentSlot = 0;
    p._prev1Slot = 0;
    p._afterFrameInserted(2);
    expect(p._currentSlot).toBe(0);
    expect(p._prev1Slot).toBe(0);
  });
});

describe('_markRemainingFailed', () => {
  it('marks only the not-yet-attempted frames (order[fromIdx..]) as failed', () => {
    const p = makePlayer() as any;
    const order = [2, 3, 4, 1, 0]; // e.g. nowIndex=2 in a 5-frame mixed config
    p._segEls = [0, 1, 2, 3, 4].map(() => ({ style: {} as Record<string, string> }));
    // Raw indices 2 and 3 are order[0]/order[1] — already attempted and
    // loaded before the failure. The rest (4, 1, 0) haven't been attempted.
    p._frameStatuses = ['empty', 'empty', 'loaded', 'loaded', 'empty'];

    p._markRemainingFailed(order, 2); // order[2..] = [4, 1, 0] — everything after the failure

    expect(p._frameStatuses[4]).toBe('failed');
    expect(p._frameStatuses[1]).toBe('failed');
    expect(p._frameStatuses[0]).toBe('failed');
    // Already-attempted frames (order[0], order[1] = 2, 3) are untouched.
    expect(p._frameStatuses[2]).toBe('loaded');
    expect(p._frameStatuses[3]).toBe('loaded');
  });
});
