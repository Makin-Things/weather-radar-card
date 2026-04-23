# v3 Plan: Remove iframe, migrate to native LitElement + Shadow DOM

## Why this is non-trivial

The iframe was chosen precisely because it sidesteps two hard problems: Leaflet knows nothing
about Shadow DOM, and Home Assistant's Shadow DOM scoping makes global CSS unreliable. Moving to
native requires solving both explicitly.

The current card renders its entire map inside an `<iframe srcdoc="...">` — an ~800-line
generated HTML string containing Leaflet, all radar logic, animation, and UI. The goal is to
move all of this into the LitElement TypeScript class so the card behaves like a normal HA card
with no iframe overhead, no srcdoc referrer workarounds, and full access to HA theming.

---

## Phase 1 — Bundle Leaflet as an ES module

**Goal:** Stop loading Leaflet from local files; import it properly into the TypeScript bundle.

- `npm install leaflet @types/leaflet`
- `npm install leaflet-toolbar` or vendor the Toolbar2 source (it has no npm package; use the
  existing `dist/leaflet.toolbar.min.js`)
- Update `rollup.config.js` — confirm tree-shaking handles Leaflet correctly
- Remove `leaflet.js`, `leaflet.toolbar.min.js` from `dist/` — they will be bundled into
  `weather-radar-card.js`
- Keep `leaflet.css` and `leaflet.toolbar.min.css` — inline into the component's `static styles`
  via `unsafeCSS()` + a raw-string Rollup import

**CSS strategy for Shadow DOM:**
LitElement's `static styles` injects a `<style>` into the shadow root. Use
`@rollup/plugin-url` or `rollup-plugin-string` to import CSS files as raw strings, then wrap
with `unsafeCSS()`. This scopes Leaflet's CSS inside the shadow root.

```typescript
import leafletCSS from 'leaflet/dist/leaflet.css?raw';
import toolbarCSS from './leaflet.toolbar.min.css?raw';

static styles = [unsafeCSS(leafletCSS), unsafeCSS(toolbarCSS), css`...`];
```

**Risk:** Leaflet 1.9 CSS uses `.leaflet-drag-target` on `<html>` for cursor changes. This
selector will not work inside the shadow root — needs a manual CSS fix.

---

## Phase 2 — Shadow DOM compatibility shim for Leaflet

**Goal:** Confirm Leaflet initialises correctly with a shadow-root-hosted container.

Leaflet 1.9 mostly works in Shadow DOM with one critical caveat: it uses `document.createElement`
to build pane divs and injects them as children of the map container. Since the container is
inside the shadow root, the panes are too — **positioning works** because Leaflet's panes use
`position: absolute` relative to `.leaflet-container`, which is their nearest positioned ancestor.

Known issues to fix explicitly:

| Issue | Fix |
|---|---|
| `L.DomUtil.getStyle()` reads computed styles via `document.defaultView` | Works — shadow root inherits `defaultView` |
| `L.Map._initContainer()` does `L.DomUtil.addClass(document.body, ...)` when dragging | Patch: override or ignore (drag class on body is cosmetic only) |
| `L.Toolbar2` may append elements relative to `document.body` | Audit; may need to patch `getContainer()` to return `this.shadowRoot` |
| Leaflet's `getPane()` / `createPane()` append to map container | Works correctly — already inside shadow root |
| `mouseout` on the map bubbles through Shadow DOM boundary re-targeted | Test; may cause phantom mouse-leave events. Fix with `composedPath()` check |

---

## Phase 3 — Restructure `render()` — remove `<iframe>`

**Goal:** Render the card's HTML directly in the LitElement template.

Replace the `<iframe srcdoc=${doc}>` with a clean LitElement template:

```typescript
render() {
  return html`
    <ha-card class="type-radar">
      <div id="color-bar"><img id="img-color-bar" height="8" /></div>
      <div id="nav-banner"></div>
      <div id="mapid" style="height: ${this._calculateHeight()}"></div>
      <div id="div-progress-bar"></div>
      <div id="bottom-container">
        <div id="timestampid"><p id="timestamp"></p></div>
        <div id="attribution"></div>
      </div>
    </ha-card>
  `;
}
```

**Shadow DOM positioning concern:**
Leaflet absolutely positions its controls relative to `.leaflet-container`. The map div must have
`position: relative` (Leaflet sets this) and an explicit height. The shadow root itself is not a
positioned element — the chain is:

```
shadow-root → ha-card → #mapid (position:relative, explicit height)
                           └── .leaflet-pane (position:absolute) ✓
                           └── .leaflet-control-container (position:absolute) ✓
```

This is safe. The danger is if anything above `ha-card` in the HA DOM has `overflow: hidden`
that clips Leaflet controls — test carefully in panel mode vs grid mode.

---

## Phase 4 — Migrate srcdoc JavaScript to TypeScript class methods

239 `var`/`function` declarations in the srcdoc migrate to ~40 TypeScript class properties and
methods. Mapping:

| srcdoc variable / function | TypeScript class member |
|---|---|
| `var frameCount, timeout, restartDelay` | Derived from `this._config` inline |
| `var radarMap` | `private _map: L.Map \| null` |
| `var radarImage[], radarTime[]` | `private _radarImage: L.TileLayer[]` |
| `var loadedSlots[], frameStatuses[]` | `private _loadedSlots: number[]` etc. |
| `var animStartWallTime, animPauseStartTime` | `private _animStart: number` etc. |
| `var frameGeneration` | `private _frameGeneration = 0` |
| `var run, navPaused, viewPaused, radarReady` | `private _run`, `_navPaused` etc. |
| `var rainviewerLimiter, noaaLimiter` | `private _rainviewerLimiter`, `_noaaLimiter` |
| `function initRadar()` | `private async _initRadar()` |
| `function applyAnimations()` | `private _applyAnimations()` |
| `function fetchRadarPaths()` | `private async _fetchRadarPaths()` |
| `createFetchTile` / `FetchTileLayer` | Separate `fetch-tile-layer.ts` file |
| `function seekToFrame()` | `private _seekToFrame(slot: number)` |
| `function pauseAnimations()` | `private _pauseAnimations()` |
| `function buildSlotKeyframes()` | `private _buildSlotKeyframes(n: number): string` |
| `function setSegmentStatus()` | `private _setSegmentStatus(fi: number, status: string)` |
| `function skipNext() / skipBack()` | `private _skipNext()` / `private _skipBack()` |
| `function updateRadar()` | `private async _updateRadar()` |

**Initialisation lifecycle:**

```
setConfig()          → stores config; calls _teardown() if map already exists
firstUpdated()       → _initMap() → _initRadar()
updated(changedProps) → if config changed → _teardown() + _initMap() + _initRadar()
disconnectedCallback() → _teardown() (removes map, clears timers, revokes object URLs)
```

**`_initMap()` responsibilities:**
- `L.map(this.shadowRoot!.getElementById('mapid'), { ... })`
- Add basemap and label tile layers
- Wire navigation event listeners (`movestart`, `moveend`, etc.)
- Wire IntersectionObserver and `visibilitychange`
- Wire ResizeObserver on `#mapid`

---

## Phase 5 — Fix iframe-specific patterns

| Current (iframe) | Replacement (Shadow DOM) |
|---|---|
| `window.parent.location.href` for Referer | `window.location.href` — card runs in main page, origin is automatically correct. The entire `parentRef` complexity disappears. |
| `window.frameElement` for IntersectionObserver | `this` (the card host element) |
| `this.document.getElementById(...)` | `this.shadowRoot!.getElementById(...)` |
| `body onresize="resizeWindow()"` | `ResizeObserver` on `#mapid` |
| `this.frameElement.offsetWidth` | `this.offsetWidth` |
| Web Worker for timer throttling | Can keep; less critical since card is in main frame and not subject to iframe timer throttling |
| `<link rel="stylesheet">` loading Leaflet CSS | Gone — bundled into `static styles` |
| `<script src="...leaflet.js">` | Gone — bundled |
| `<style id="radar-dynamic">` injected keyframes | `this.shadowRoot!.getElementById('radar-dynamic').textContent = ...` — same approach, different query target |

---

## Phase 6 — CSS audit for Shadow DOM

Critical items to verify after migration:

1. **`.leaflet-container` height** — must be set explicitly (currently done via inline style). ✓
2. **Toolbar position** — `L.Toolbar2.Control` at `bottomright`; uses `position: absolute`
   relative to `.leaflet-control-container` which is a child of the map container. ✓
3. **z-index stacking** — Leaflet's z-indexes (200–700) are fine within the shadow root's
   stacking context; HA's overlays won't interfere as they are in a separate stacking context.
4. **Leaflet drag cursor** — `L.DomUtil.addClass(document.body, 'leaflet-drag-target')` adds a
   cursor class to `<body>` during drag. Cosmetic only; patch to apply to shadow host instead or
   add an equivalent rule inside `static styles`.
5. **Scale control** — uses absolute positioning within `.leaflet-control-container`. ✓
6. **Dark mode** — currently applied by JS setting `backgroundColor` on specific elements.
   Migrate to CSS custom properties (`--radar-bg`, `--radar-text`) toggled by a `dark` attribute
   on the host element, driven by `map_style`.
7. **Marker SVG icons** — currently loaded from `/local/community/weather-radar-card/`.
   Consider inlining as data URIs or importing as raw SVG strings so they bundle with the card
   and remove the dependency on manually placed files.

---

## Phase 7 — Testing matrix

### Map and tiles
- [ ] Light / Dark / Voyager / Satellite / OSM map styles render correctly
- [ ] RainViewer radar tiles load, animate, and respect rate limit (100/min)
- [ ] NOAA radar tiles load, animate, and respect rate limit (120/min)
- [ ] Tile retry fires on HTTP errors; 404 stops immediately; 429 waits and retries
- [ ] Progress bar segments: gray → yellow → blue / red as tiles settle
- [ ] Newest frame shown immediately as static while older frames load
- [ ] Animation starts at 2+ loaded frames; failed frames skipped in loop
- [ ] `updateRadar()` fires at correct interval and shifts frames correctly

### Navigation and interaction
- [ ] Pan and zoom work — mouse drag, scroll wheel, pinch, keyboard
- [ ] Navigation pause: banner appears, single frame loaded, full history restored after 5s settle
- [ ] Progress bar resets to gray on nav start
- [ ] Animation restarts after navigation restore (not stuck paused)
- [ ] Static map mode disables all interaction

### Marker
- [ ] Home marker icon renders at correct lat/lon
- [ ] Marker positioned correctly in all map styles (Light, Dark, OSM, Satellite)
- [ ] Marker visible in all zoom levels (4–10)
- [ ] `entity_picture` marker icon loads and displays
- [ ] MDI icon markers render correctly
- [ ] Mobile marker override shows correct icon/position on mobile UA
- [ ] Marker does not drift or misalign after pan/zoom
- [ ] Marker still present after `updateRadar()` replaces frame layers
- [ ] Range rings render centred on marker position

### Playback controls
- [ ] Toolbar renders at `bottomright` without clipping in panel and grid modes
- [ ] Play/pause button toggles correctly; icon stays in sync
- [ ] Skip-back / skip-next step one frame and leave animation paused
- [ ] Skip buttons disabled (no-op) when fewer than 2 frames loaded
- [ ] Recenter button returns to configured center lat/lon and zoom

### Layout and sizing
- [ ] Panel mode (full-width): map fills correctly, controls not clipped
- [ ] Grid mode: explicit height / `square_map` / auto height all render correctly
- [ ] ResizeObserver fires on card resize and Leaflet re-invalidates correctly
- [ ] Height and width CSS units (`px`, `vh`, `%`) all work

### Pause behaviour
- [ ] IntersectionObserver pauses animation when card scrolled out of view
- [ ] Animation resumes when card scrolled back into view
- [ ] `visibilitychange` pauses when tab hidden, resumes when visible
- [ ] User-initiated pause (play button) is preserved across nav restore and `updateRadar()`

### HA-specific
- [ ] Card renders correctly in HA dashboard edit mode
- [ ] Config editor updates map in real time without leaving the editor
- [ ] HACS installation works with bundled Leaflet (no separate file copy needed)
- [ ] No console errors in Chrome, Firefox, and Safari

---

## Effort and risk estimate

| Phase | Effort | Risk |
|---|---|---|
| 1 — Bundle Leaflet | Small | Low |
| 2 — Shadow DOM shim | Medium | Medium — needs incremental browser testing |
| 3 — Render restructure | Small | Low |
| 4 — JS → TS migration | Large | Medium — 239 declarations, careful state threading |
| 5 — iframe pattern fixes | Small | Low — mostly mechanical substitutions |
| 6 — CSS audit | Medium | High — Shadow DOM CSS edge cases are subtle |
| 7 — Testing | Medium | — |

**Total: ~3–5 days of focused work.**

---

## Release strategy

- Branch: `v3-no-iframe` off `master`
- Version: **3.0.0** (breaking change — removes separately-installed Leaflet files)
- Keep `tile-fixes` branch alive as the stable v2 track until v3 passes the full testing matrix
- Update README install instructions: remove the manual file-copy step, HACS users get
  everything from a single `weather-radar-card.js`
- Marker SVG icons and colour-bar images can be inlined as data URIs in v3, removing all
  separately-distributed static assets

---

## Key simplifications gained

1. **Referrer header** — `window.location.href` is the real HA page origin. The entire
   `createFetchTile` referrer workaround (`parentRef`, `window.parent.location.href`) disappears.
2. **Timer throttling** — Web Worker approach may be retired; main-frame `setTimeout` is not
   throttled the same way iframe timers are.
3. **CSS scoping** — Shadow DOM provides natural isolation; no need for carefully namespaced
   selectors inside the srcdoc.
4. **Debugging** — All state is in the TypeScript class, visible in DevTools as class properties
   rather than buried inside an iframe's JavaScript scope.
5. **Install simplicity** — Single JS file, no manual file copy, HACS just works.
