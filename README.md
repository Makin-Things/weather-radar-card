# Weather Radar Card

A Home Assistant rain radar card using tiled radar imagery from RainViewer and NOAA/NWS.

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE)
![Maintenance](https://img.shields.io/maintenance/yes/2026?style=for-the-badge)

## Description

This card displays animated weather radar loops within Home Assistant. It supports multiple radar data sources and map styles, and can be zoomed and panned seamlessly.

![Weather Radar card](https://raw.githubusercontent.com/makin-things/weather-radar-card/master/weather-radar-card.gif)

## What's New in 3.0

Version 3.0 is a complete rewrite of the card internals. The user-visible behaviour is unchanged, but the implementation is fundamentally different.

### No more iframe

Previous versions rendered the map inside a hidden `<iframe>` to work around Leaflet's incompatibility with Home Assistant's Shadow DOM. Version 3.0 is a native LitElement web component — the map lives directly in the card's Shadow DOM alongside the rest of your dashboard. This means:

- Proper integration with HA theming and layout
- No opaque origin / referrer header workarounds
- Faster initial render and lower memory overhead
- Full browser DevTools visibility into card state

### Leaflet is now bundled

Leaflet is imported as an npm module and compiled into `weather-radar-card.js`. You no longer need to manually copy `leaflet.js`, `leaflet.css`, `leaflet.toolbar.min.js`, or `leaflet.toolbar.min.css` into your `www` folder. **If upgrading from v2, delete those files** — they are unused and waste space.

The only files still distributed alongside `weather-radar-card.js` are the toolbar icon PNGs, the marker SVGs, and the colour-bar image.

### Save map center from the card

In Home Assistant edit mode, pan and zoom the map to your desired position and a **Save as map center** button appears. Clicking it writes the new `center_latitude`, `center_longitude`, and `zoom_level` directly into the card config — no need to look up or type coordinates manually.

### Other improvements

- NOAA/NWS radar source (US only, experimental)
- Show Snow toggle (RainViewer only) — includes or excludes snow in the precipitation display
- Rate-limit banner — visible indicator when the API quota is temporarily exhausted
- Animated crossfades via CSS `transition` on layer containers (simpler and more reliable than the previous CSS keyframe engine)
- Marker defaults to HA home location rather than the map center, so changing the map center no longer moves the marker
- **Scrubbable timeline** — click or drag the progress bar to jump to any frame
- **Locale-aware timestamps** — the frame time display uses the browser's locale automatically, showing 12 h (AM/PM) for US users and 24 h for everyone else, with locale-appropriate date ordering
- **Auto map style** — `map_style: Auto` follows the OS light/dark mode preference; switches the map automatically when the system theme changes
- **Configurable double-tap action** — `double_tap_action` can re-centre the map, toggle play/pause, or execute any standard HA action (navigate, call-service, etc.)
- Show/hide the progress bar and colour bar independently via config

---

## Options

All options can be configured using the GUI editor — there is no need to edit YAML directly.

| Name | Type | Requirement | Description | Default |
| ---- | ---- | ----------- | ----------- | ------- |
| type | string | **Required** | | must be `'custom:weather-radar-card'` |
| card_title | string | **Optional** | Title displayed on the card | no title |
| data_source | string | **Optional** | Radar tile source (see [Data Source](#data-source)) | `'RainViewer'` |
| map_style | string | **Optional** | Map style (see [Map Style](#map-style)) | `'Light'` (English) / `'OSM'` (other languages) |
| zoom_level | number | **Optional** | Initial zoom level, 3–10 | `7` |
| center_latitude | number / string | **Optional** | Initial map center latitude — number or entity ID | HA instance location |
| center_longitude | number / string | **Optional** | Initial map center longitude — number or entity ID | HA instance location |
| markers | list | **Optional** | List of map markers (see [Markers](#markers)) | none |
| frame_count | number | **Optional** | Number of frames in the loop | `5` |
| frame_delay | number | **Optional** | Milliseconds to display each frame | `500` |
| restart_delay | number | **Optional** | Extra milliseconds to hold the last frame before looping | `1000` |
| animated_transitions | boolean | **Optional** | Enable crossfade transitions between frames | `true` |
| transition_time | number | **Optional** | Crossfade duration in ms. Default is 40% of frame_delay | auto |
| show_snow | boolean | **Optional** | Include snow in the precipitation display (RainViewer only) | `false` |
| show_color_bar | boolean | **Optional** | Show the radar colour scale bar (RainViewer only) | `true` |
| show_progress_bar | boolean | **Optional** | Show the frame progress / timeline bar | `true` |
| show_scale | boolean | **Optional** | Show a distance scale bar on the map | `false` |
| double_tap_action | string / object | **Optional** | Action on double-tap: `'recenter'`, `'toggle_play'`, `'none'`, or any HA action object | `'none'` |
| disable_scroll | boolean | **Optional** | Disable map pan/drag while keeping pinch-to-zoom; lets mobile users swipe the page past the map | `false` |
| static_map | boolean | **Optional** | Disable all panning and zooming | `false` |
| show_zoom | boolean | **Optional** | Show zoom controls | `false` |
| square_map | boolean | **Optional** | Keep the map square | `false` |
| show_playback | boolean | **Optional** | Show playback controls toolbar | `false` |
| show_recenter | boolean | **Optional** | Show re-center button in toolbar | `false` |
| show_range | boolean | **Optional** | Show range rings around the first marker | `false` |
| extra_labels | boolean | **Optional** | Show more place labels (labels become smaller) | `false` |
| height | string | **Optional** | Custom card height using CSS units e.g. `'400px'`, `'50vh'` | `'400px'` |
| width | string | **Optional** | Custom card width using CSS units e.g. `'500px'`, `'80%'` | `'100%'` |

### Data Source

Selects where radar tile data comes from.

| Value | Coverage | Notes |
| ----- | -------- | ----- |
| `RainViewer` | Global | Default. Updated every 5 minutes, ~1–6 minute lag. No API key required. Personal/educational use only per RainViewer terms. |
| `NOAA` | US only | Experimental. Uses NOAA/NWS MRMS base reflectivity composite via `mapservices.weather.noaa.gov`. Government data — free, no API key. 15-minute lag, 5-minute frame steps. |

> **NOAA note:** This is an experimental feature using a public government service with no documented rate limits. It is US-only. Radar tiles are fetched at a maximum of zoom 7 (the native 1 km MRMS resolution) and upscaled for display.

### Map Style

Specifies the base map style. All CARTO-based styles render labels in English only. Use OpenStreetMap for localized labels.

| Value | Description |
| ----- | ----------- |
| `Auto` | Follows OS dark/light mode — Dark when system is dark, Light (English) or OSM (other) when light |
| `Light` | CARTO Light — English only |
| `Dark` | CARTO Dark — English only |
| `Voyager` | CARTO Voyager — English only |
| `Satellite` | ESRI World Imagery — English only |
| `OSM` | OpenStreetMap — labels rendered in local language |

When `map_style` is not set or set to `Auto`, the card picks Dark when the OS is in dark mode, `Light` for English-language instances in light mode, and `OSM` for all other languages in light mode. The map updates automatically if the OS theme changes.

> **OpenStreetMap note:** OSM tiles are provided by the OpenStreetMap community. For high-traffic deployments please consider the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

### Animation

Each frame is a Leaflet tile layer. The card loads all frames simultaneously (newest first) and switches between them using JavaScript-driven opacity changes. This approach works reliably in Shadow DOM without any CSS cascade or reflow interactions.

**Timeline scrubbing:**

Click anywhere on the progress bar to jump to that frame, or click and drag to scrub through the loop. Dragging pauses the animation; releasing resumes it if playback was active.

**Timestamp:**

The frame timestamp uses the browser's locale via `Intl.DateTimeFormat`, so 12 h (AM/PM) or 24 h format is chosen automatically based on the user's regional settings.

**Crossfade (animated_transitions: true):**

When one frame fades out and the next fades in, the outgoing frame's `opacity` transitions to `0` and the incoming frame's transitions to `1` simultaneously over `transition_time` milliseconds, producing a smooth crossfade.

**Hard cut (animated_transitions: false):**

Opacity changes are instant — no transition property is applied.

**Automatic pause:**

- Animation pauses when the card is scrolled out of view or the browser tab is hidden, and resumes when visible again.
- During map navigation (panning or zooming), only the latest single frame is loaded to reduce tile requests. Full frame history is restored 100 ms after the map settles.

### Double-tap Action

`double_tap_action` fires when the user double-clicks the map (or double-taps on touch). Leaflet's built-in double-click zoom is automatically disabled when a non-`none` action is configured.

Simple shortcut values:

| Value | Behaviour |
| ----- | --------- |
| `none` | No action (default) |
| `recenter` | Return the map to the configured center and zoom |
| `toggle_play` | Toggle radar playback on/off |

For advanced use, any standard HA action object is accepted in YAML:

```yaml
double_tap_action:
  action: navigate
  navigation_path: /lovelace/cameras
```

```yaml
double_tap_action:
  action: call-service
  service: scene.turn_on
  service_data:
    entity_id: scene.evening
```

### Markers

The `markers` option accepts a list. Each entry can have:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `entity` | string | Entity ID (`device_tracker.*`, `person.*`, `zone.*`). Position is read from the entity's `latitude`/`longitude` attributes and updated live on every HA state change. |
| `latitude` | number | Static latitude (used when `entity` is not set or unavailable) |
| `longitude` | number | Static longitude |
| `icon` | string | `'default'` (home SVG), `'entity_picture'`, or `'mdi:icon-name'` |
| `icon_entity` | string | Entity ID for the picture when `icon: entity_picture`. Auto-detected from `entity` if blank. |
| `track` | string / bool | `'entity'` — pan the map to follow this marker; `true` — lowest-priority always-on fallback |
| `mobile_only` | boolean | Only show this marker on mobile devices |

#### Track resolution

When multiple markers have `track` set, the card picks one to centre the map on using this priority order (evaluated on every HA update):

1. **`track: entity` on a `person.*` entity whose `user_id` matches the currently logged-in HA user** — highest priority. "I am this person, follow me."
2. **`track: entity` on any other entity** — viewer-independent tracking.
3. **`track: true`** — lowest always-on fallback; overridden by any `track: entity` match.

Multiple markers at the same priority level log a console warning and use the first one in the list.

#### Migration from single-marker config

If you have the old `marker_latitude` / `marker_longitude` / `show_marker` fields, the card automatically converts them to a `markers[]` entry in memory on load. Your existing YAML continues to work — no changes required. A deprecation warning is logged to the browser console.

#### Examples

Static home marker:

```yaml
markers:
  - latitude: -33.86
    longitude: 151.21
    icon: mdi:home
```

Track a person (centres map on them when they are the logged-in user):

```yaml
markers:
  - entity: person.john
    icon: entity_picture
    track: entity
```

Multiple markers — person takes priority over van for John, van tracks for everyone else:

```yaml
markers:
  - entity: person.john
    icon: entity_picture
    track: entity

  - entity: device_tracker.van
    icon: mdi:car
    track: entity

  - latitude: -33.86
    longitude: 151.21
    icon: mdi:home
```

Desktop shows home marker; mobile shows current device location:

```yaml
markers:
  - latitude: -33.86
    longitude: 151.21
    icon: mdi:home

  - entity: device_tracker.my_phone
    icon: entity_picture
    mobile_only: true
```

## Samples

Basic radar loop with a static home marker:

```yaml
type: 'custom:weather-radar-card'
frame_count: 10
center_latitude: -25.567607
center_longitude: 152.930597
show_range: true
show_zoom: true
show_recenter: true
show_playback: true
zoom_level: 8
markers:
  - latitude: -26.175328
    longitude: 152.653189
    icon: mdi:home
```

Dense 24-hour loop:

```yaml
type: 'custom:weather-radar-card'
frame_count: 144
frame_delay: 100
markers:
  - latitude: -33.857058
    longitude: 151.215179
    icon: default
```

Custom card dimensions:

```yaml
type: 'custom:weather-radar-card'
height: '400px'
width: '600px'
show_playback: true
zoom_level: 7
```

US NOAA radar with slow crossfade:

```yaml
type: 'custom:weather-radar-card'
data_source: NOAA
map_style: Light
zoom_level: 8
frame_count: 6
frame_delay: 600
transition_time: 300
show_playback: true
show_recenter: true
```

Localized map labels using OpenStreetMap:

```yaml
type: 'custom:weather-radar-card'
map_style: OSM
zoom_level: 7
markers:
  - latitude: -33.86
    longitude: 151.21
    icon: mdi:home
```

Desktop shows home marker, mobile shows current device location:

```yaml
type: 'custom:weather-radar-card'
center_latitude: -25.567607
center_longitude: 152.930597
show_range: true
zoom_level: 8
markers:
  - latitude: -25.567607
    longitude: 152.930597
    icon: mdi:home

  - entity: device_tracker.my_phone
    icon: entity_picture
    mobile_only: true
```

Track a person — map follows them when they are the logged-in user:

```yaml
type: 'custom:weather-radar-card'
show_range: true
show_recenter: true
zoom_level: 9
markers:
  - entity: person.john
    icon: entity_picture
    track: entity
```

## Install

### HACS

If you use HACS, the card is part of the default HACS store.

### Manual

Download the files from the [latest release](https://github.com/makin-things/weather-radar-card/releases) and place them in `www/community/weather-radar-card` in your HA `config` directory:

```text
└── configuration.yaml
└── www
    └── community
        └── weather-radar-card
            └── weather-radar-card.js
            └── home-circle-dark.svg
            └── home-circle-light.svg
            └── pause.png
            └── play.png
            └── radar-colour-bar-universalblue.png
            └── recenter.png
            └── skip-back.png
            └── skip-next.png
```

> **Upgrading from v2?** Delete `leaflet.js`, `leaflet.css`, `leaflet.toolbar.min.js`, and `leaflet.toolbar.min.css` from `www/community/weather-radar-card/` — they are bundled into `weather-radar-card.js` in v3 and the old files are no longer used.

Then add the following to your Lovelace resources:

```yaml
resources:
  - url: /local/community/weather-radar-card/weather-radar-card.js
    type: module
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a complete history of changes.

[license-shield]: https://img.shields.io/github/license/makin-things/weather-radar-card.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/makin-things/weather-radar-card.svg?style=for-the-badge
[releases]: https://github.com/makin-things/weather-radar-card/releases
