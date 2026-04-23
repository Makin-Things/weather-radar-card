# v3 No-Iframe Progress

Branch: `v3-no-iframe` (off master at `57c1778`)

---

## Status

### Phase 1 — Bundle Leaflet ✅ complete
- [x] `npm install leaflet @types/leaflet`
- [x] `npm install --save-dev rollup-plugin-string`
- [x] rollup.config.js updated for CSS string imports
- [x] Leaflet CSS inlined into shadow root via `unsafeCSS()`

### Phase 2 — Shadow DOM shim ✅ complete (folded into Phase 4)
- Leaflet map container is inside shadow root — pane positioning works correctly
- Drag cursor class handled via shadow-root CSS rule
- No popups used so document.body injection is not an issue

### Phase 3 — render() restructure ✅ complete
- [x] iframe removed from render()
- [x] Clean LitElement template with stable mounting points
- [x] Dynamic `<style>` element for keyframes created imperatively in firstUpdated()

### Phase 4 — JS → TS migration ✅ complete (builds clean)
- [x] `src/rate-limiter.ts` — RateLimiter class
- [x] `src/fetch-tile-layer.ts` — FetchTileLayer / FetchWmsTileLayer / layerSettled
- [x] `src/radar-toolbar.ts` — Custom L.Control replacing Leaflet.Toolbar2
- [x] `src/weather-radar-card.ts` — full rewrite (~700 lines clean TypeScript)

### Phase 5 — iframe-specific pattern fixes ✅ complete
- [x] `window.location.href` replaces `window.parent.location.href` (no more opaque origin)
- [x] `IntersectionObserver` observes `this` (the card host element) not `window.frameElement`
- [x] `ResizeObserver` on `#mapid` replaces iframe `body onresize`
- [x] `this.shadowRoot.getElementById()` replaces `this.document.getElementById()`
- [x] Web Worker timer kept for background-tab throttling prevention

### Phase 6 — CSS audit ⬜ (needs browser testing)

### Phase 7 — Testing ⬜ **→ READY FOR T1**

---

## Decisions made during implementation

### Leaflet.Toolbar2 → custom L.Control
Leaflet.Toolbar2 uses `window.L` and is not an ES module. Rather than shimming it,
v3 replaces it with `RadarToolbar extends L.Control` written in TypeScript
(`src/radar-toolbar.ts`). Same 4 buttons, no external dependency.

### Dynamic keyframes → `adoptedStyleSheets` / imperative `<style>`
The `<style id="radar-dynamic">` element is created imperatively in `firstUpdated()`
and appended to the shadow root. LitElement never touches it because it is not in the
`render()` template. This avoids any risk of LitElement resetting `textContent` on
re-render.

### Referrer header
Without the srcdoc iframe, tile fetches originate from the actual HA page. The
`window.location.href` referrer is correct automatically. The `parentRef` /
`window.parent.location.href` complexity is gone.

### Web Worker timer
Kept. While the card is no longer inside an iframe (so iframe timer throttling
doesn't apply), the Web Worker approach still helps prevent background-tab throttling
of `setTimeout`.

### CSS imports
`rollup-plugin-string` handles `import css from '*.css'` as raw strings.
Leaflet CSS is imported as a string and passed to `unsafeCSS()` in `static styles`.
Leaflet.Toolbar2 CSS is inlined from `dist/leaflet.toolbar.min.css` the same way.

---

## Testing checkpoints

| # | What to test | Status |
|---|---|---|
| T1 | Basic Leaflet map renders in shadow DOM, no console errors | ⬜ |
| T2 | All 5 basemap styles render correctly | ⬜ |
| T3 | RainViewer radar tiles load and animate | ⬜ |
| T4 | NOAA tiles load and animate | ⬜ |
| T5 | Markers render at correct position in all styles | ⬜ |
| T6 | Playback controls work (play/pause/skip) | ⬜ |
| T7 | Navigation pause / restore cycle works | ⬜ |
| T8 | Scroll visibility pause works | ⬜ |
| T9 | Panel mode layout correct | ⬜ |
| T10 | Config editor changes apply live | ⬜ |

---

## Known issues / blockers

_(none yet)_
