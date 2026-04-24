# Radar Animation Architecture

## Goal

Show a looping animation of N radar frames (oldest → newest), with the newest
frame held longer (restart delay) before the loop repeats. When
`animated_transitions` is enabled, consecutive frames crossfade; when disabled,
they cut instantly.

---

## Layer structure

Each radar frame is a Leaflet tile layer (`FetchTileLayer` or
`FetchWmsTileLayer`). All frames are added to the map simultaneously and stacked
in z-order (oldest = lowest, newest = highest). Only the "current" frame's outer
container is at `opacity: 1`; all others are `opacity: 0`.

```text
z-index 5  ┌──────────────────────────────┐  frame[4] = newest  opacity: 1
z-index 4  │  frame[3]                    │                     opacity: 0
z-index 3  │  frame[2]                    │                     opacity: 0
z-index 2  │  frame[1]                    │                     opacity: 0
z-index 1  └──────────────────────────────┘  frame[0] = oldest  opacity: 0
           (all cover the same geographic area)
```

---

## JS-driven frame loop

The animation is driven by `RadarPlayer._startLoop()` / `_scheduleNext()` /
`_showSlot()`. There are no CSS keyframes.

### `_showSlot(slot)`

Sets `el.style.opacity = '1'` on the current slot's outer `.leaflet-layer`
container and `el.style.opacity = '0'` on every other slot's container. If
`animated_transitions` is enabled, `el.style.transition = 'opacity Xms linear'`
is set before the opacity write, so the browser interpolates the change as a
crossfade. If disabled, `el.style.transition = 'none'` gives a hard cut.

### `_scheduleNext(gen)`

After showing a slot, schedules the next tick via `setTimeout`:

- All slots except the last: delay = `frame_delay`
- Last slot (newest): delay = `frame_delay + restart_delay`

The `gen` token (incremented by `_stopLoop()`) is checked inside the callback to
abort stale timers without needing to track timer IDs.

### Loop lifecycle

```text
_startLoop(startSlot?)
  └── _showSlot(currentSlot)
  └── _scheduleNext(gen)
        └── [after delay] currentSlot = (currentSlot + 1) % n
        └── _showSlot(currentSlot)
        └── _scheduleNext(gen)   ← repeats
```

Pausing: `_stopLoop()` increments `_loopGen`, which causes all pending
`_scheduleNext` callbacks to return immediately (`gen !== this._loopGen`).

Resuming: `_startLoop()` increments `_loopGen` again and starts a fresh chain
from `_currentSlot`.

---

## Opacity ownership

Leaflet normally controls tile opacity through `_updateOpacity()`, which writes
`container.style.opacity` (outer layer div) and `tile.style.opacity` (each img).
This would fight the animation.

For radar layers, `animationOwnsOpacity: true` is set. This activates an
override of `_updateOpacity()` in `FetchTileLayer` / `FetchWmsTileLayer`:

- **Outer `.leaflet-layer` container** — never touched by Leaflet. The frame
  loop (`_showSlot`) is the only code that writes `el.style.opacity` here.
- **Inner `.leaflet-tile-container` divs** — set to `opacity: 1` by the
  override (bypasses the CSS fade-in that normally starts them at 0).
- **Individual `<img>` tile elements** — set to `opacity: 1` by the override
  (bypasses Leaflet's 200 ms per-tile fade-in).

The inner tiles are always fully visible and renderable. The outer container's
opacity gates whether they appear on screen.

---

## Frame loading sequence

Frames are loaded newest-first. As each frame settles (`layerSettled`):

1. Its outer container starts at `opacity: 0`.
2. The very first frame to load is shown as a static preview (`opacity: 1`)
   while older frames load in the background.
3. Once two frames are loaded, `_startLoop(n-1)` starts the animation at the
   newest slot so the preview continues without a flash.
4. Each subsequent older frame that loads causes `_currentSlot++` to keep the
   index pointing at the same frame (since `unshift` shifts all indices up by 1).

---

## Invariants

1. Only `_showSlot` writes the outer `.leaflet-layer` container's `opacity`
   while the loop is running.
2. `_updateOpacity` must set inner tile and tile-container opacities to `1`
   but must NOT touch the outer container.
3. `_currentSlot` is always a valid index into `_loadedSlots` (`_showSlot`
   bounds-checks and returns early if not).
4. `_frameGeneration` is checked after every `await` in `_initRadar` and
   `_updateRadar` to abort stale async chains after teardown.
5. `_loopGen` is checked at the top of every `_scheduleNext` callback to
   discard timers that fired after a `_stopLoop()` call.
