# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.1.0] - 2026-04-25

### Added

- **Multi-marker support** — `markers` array replaces the old single-marker fields. Each entry supports `entity`, `latitude`, `longitude`, `icon`, `icon_entity`, `track`, and `mobile_only`.
- **Live entity tracking** — markers with an `entity` field update their position on every HA state change. Works with `device_tracker.*`, `person.*`, `zone.*`, or any entity with `latitude`/`longitude` attributes.
- **Track resolution** — set `track: entity` or `track: true` on a marker to auto-centre the map. Priority: (1) `track: entity` on a `person.*` whose `user_id` matches the logged-in HA user, (2) `track: entity` on any other entity, (3) `track: true`. Ties at the same level warn to console and use the first marker.
- **`mobile_only` marker flag** — a marker with `mobile_only: true` is only shown on mobile devices (HA Companion app, mobile user agent, or screen width ≤ 768 px). Replaces the old `mobile_marker_*` fields.
- **Auto-migration** — if `markers` is absent but old single-marker fields (`marker_latitude`, `marker_longitude`, `mobile_marker_*`, `marker_icon`, etc.) are present, the card synthesises a `markers[]` in memory on load so existing YAML continues to work without changes. A deprecation warning is logged to the browser console.
- **Marker clustering** (`cluster_markers: true`) — nearby markers collapse into a count badge. Tap/click the badge to spiderfy (fan out) individual markers in place. The tracked marker always renders outside the cluster so panning and z-index remain precise. Clusters containing a home marker show the home icon in the badge. Cluster icon colours match the current map style (dark/light).
- **Icon colour** (`color` field per marker) — CSS colour for `default` and `mdi:*` icons. The default home icon renders as inline SVG when a colour is set, enabling any hex or named colour without extra asset files. Has no effect on `entity_picture`.
- **Configurable home suppression** (`home_radius` per marker, default 500 m) — entity-based markers are hidden when HA reports `state: home` (authoritative) or the entity is within `home_radius` metres of the HA home location. Set `home_radius: 0` to always show. `zone.*` entities and static lat/lon markers are never suppressed. When `show_marker: true` is migrated with no position, a `zone.home` marker is created automatically so the home icon is always visible.
- **Tracked marker always on top** — the tracking winner gets `zIndexOffset: 1000` so it renders above all other markers.
- **`map_style: Satellite` home marker** — default home icon now correctly uses the light SVG on satellite maps (was using dark SVG).
- **Unit test suite** — 128 Vitest tests covering migration, position resolution, track priority, home suppression, distance/haversine, and icon rendering. Tests run in CI before every build.

### Changed

- **Breaking: single-marker config fields deprecated.** `show_marker`, `marker_latitude`, `marker_longitude`, `marker_icon`, `marker_icon_entity`, `mobile_marker_latitude`, `mobile_marker_longitude`, `mobile_marker_icon`, `mobile_marker_icon_entity` are no longer written by the editor and will be removed in a future version. Existing YAML still works via auto-migration.
- Editor Location section now only contains map center coordinates; marker configuration is in the new Markers section with per-marker rows.
- Editor Mobile Overrides section removed — use `mobile_only: true` on a marker instead.

## [3.0.1] - 2026-04-24

### Added

- `disable_scroll` option — disables map pan/drag (mouse and touch) while keeping pinch-to-zoom active; lets mobile users swipe through the HA dashboard without moving the map

### Fixed

- `show_scale` had no effect — the Leaflet scale control was never added to the map despite the option being present in config and the editor toggle being wired. Now correctly renders the scale bar, respecting the HA instance unit system (metric / imperial).

## [3.0.0] - 2026-04-24

### Added

- NOAA/NWS radar source — US-only experimental mode using MRMS base reflectivity via `mapservices.weather.noaa.gov`
- Show Snow option — includes or excludes snow in RainViewer precipitation tiles
- Rate-limit banner — visible indicator when the API tile quota is temporarily exhausted
- Save map center in edit mode — pan/zoom the card while editing and click the overlay button to write `center_latitude`, `center_longitude`, and `zoom_level` back to config without manually entering coordinates
- Marker icon options — `default`, `entity_picture`, and MDI icon types configurable per device (desktop / mobile)
- `show_color_bar` option — hide the RainViewer radar colour scale bar (default shown)
- `show_progress_bar` option — hide the frame timeline bar (default shown)
- `map_style: Auto` — follows OS dark/light mode via `prefers-color-scheme`; map reinitialises automatically when the system theme changes at runtime
- `double_tap_action` — configurable double-tap/double-click action: built-in shortcuts (`recenter`, `toggle_play`) or any standard HA action object (`navigate`, `call-service`, etc.)
- Scrubbable timeline — click or drag the progress bar to seek to any frame; dragging pauses playback, releasing resumes it
- Locale-aware frame timestamp — uses `Intl.DateTimeFormat` with the browser locale, so 12 h (AM/PM) or 24 h is chosen automatically per the user's regional settings

### Changed

- **Breaking: Leaflet is now bundled.** `leaflet.js`, `leaflet.css`, `leaflet.toolbar.min.js`, and `leaflet.toolbar.min.css` are no longer distributed as separate files — they are compiled into `weather-radar-card.js`. Delete the old files from `www/community/weather-radar-card/` when upgrading.
- **Breaking: iframe removed.** The card is now a native LitElement / Shadow DOM component. No srcdoc, no opaque origin workarounds, proper HA theming integration.
- Leaflet.Toolbar2 replaced by a native `L.Control` implementation — removes the external toolbar dependency entirely.
- Animation engine replaced: frame switching is now driven by JavaScript opacity writes with CSS `transition` for crossfades, replacing the previous CSS `@keyframes` engine. More reliable across all browsers in Shadow DOM context.
- Map auto-selects `Light` (CARTO) for English-language HA instances in light mode and `OSM` for all other languages; `map_style: Auto` extends this with dark-mode awareness.
- Marker defaults to HA home location (`hass.config.latitude/longitude`) rather than the card's `center_latitude` — changing the map center no longer moves the marker.
- Navigation settle delay reduced from 500 ms to 100 ms.

### Fixed

- Animation flash-on-load caused by duplicate `_initRadar` runs sharing the same frame generation counter
- `_updateRadar` crash when the RainViewer API returns an empty frame list
- `_updateRadar` mutations continuing after card teardown (missing generation guard)
- `once('load')` callback in `_updateRadar` running after `clear()` with no teardown guard
- `resolveCoordinate` treating coordinate `0` (equator / Prime Meridian) as falsy and substituting the fallback value
- Mobile marker icon defaulting to `entity_picture` when not explicitly configured
- `visibilitychange` listener accumulating on `document` across card reinitializations (never removed)
- Worker Blob URL never revoked on `clear()`
- Editor direct mutation of `@state` config via `delete` instead of spreading to a new object

## [2.2.0] - 2026-01-05

### Changed

- **CRITICAL**: Replaced deprecated Rollup build plugins with modern @rollup/* equivalents
  - Migrated from rollup-plugin-babel to @rollup/plugin-babel
  - Migrated from rollup-plugin-commonjs to @rollup/plugin-commonjs
  - Migrated from rollup-plugin-node-resolve to @rollup/plugin-node-resolve
- Updated build tooling to latest versions
  - Rollup: 2.79.1 → 4.31.0
  - TypeScript: 4.8.3 → 5.7.3
  - ESLint: 7.32.0 → 8.57.1
  - Prettier: 2.7.1 → 3.4.2
  - @rollup/plugin-json: 4.1.0 → 6.1.0
  - @rollup/plugin-terser: 0.4.4 (replaces rollup-plugin-terser)
  - @typescript-eslint packages: 5.38.1 → 8.19.1
- Updated framework dependencies
  - Lit: 2.2.2 → 3.3.2
  - home-assistant-js-websocket: 5.11.1 → 9.4.0
- Migrated to ES modules (added "type": "module" to package.json)
- Renamed .eslintrc.js to .eslintrc.cjs for CommonJS compatibility

### Fixed

- Performance: Fixed shouldUpdate() to use proper change detection instead of always returning true
- Security: Added JSON.stringify() to all config value injections to prevent potential template injection
- Build: Added proper ES module imports with .js extensions for Rollup 4.x compatibility
- Build: Added createRequire for require.resolve() usage in ES modules

### Security

- Zero vulnerabilities detected after dependency updates
- Improved security with proper escaping of configuration values in iframe templates

## [2.1.1] - 2024

### Added

- Entity attribute support for dynamic coordinate tracking
- Mobile device detection for coordinate overrides
- Configurable height and width options for the card

### Changed

- Updated maintainer information (John Pettitt)

## [2.1.0] - 2022-09-14

### Fixed

- Fixed compatibility with Home Assistant 2022.11 breaking changes
- Updated Leaflet to 1.9.1

## [2.0.4] - 2022

### Added

- Imperial units support - card displays miles in scale when HA is set to imperial
- Extra attribution links in footer
- Card title support

### Fixed

- Map style exception handling
- Attribution links

### Changed

- Updated default location and zoom level
- Removed radar locations and geofence features

## Earlier Versions

For changes in versions prior to 2.0.4, please refer to the git commit history.

[Unreleased]: https://github.com/jpettitt/weather-radar-card/compare/v3.1.0...HEAD
[3.1.0]: https://github.com/jpettitt/weather-radar-card/compare/v3.0.1...v3.1.0
[3.0.1]: https://github.com/jpettitt/weather-radar-card/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/jpettitt/weather-radar-card/compare/v2.2.0...v3.0.0
[2.2.0]: https://github.com/jpettitt/weather-radar-card/compare/v2.1.1...v2.2.0
[2.1.1]: https://github.com/jpettitt/weather-radar-card/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/jpettitt/weather-radar-card/compare/v2.0.4...v2.1.0
[2.0.4]: https://github.com/jpettitt/weather-radar-card/releases/tag/v2.0.4
