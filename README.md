# Weather Radar Card

A Home Assistant rain radar card using tiled radar imagery from RainViewer and NOAA/NWS.

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE)
![Maintenance](https://img.shields.io/maintenance/yes/2026?style=for-the-badge)

## Support

Help support development with a donation!

[![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/theOzzieRat)

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
| center_latitude | number / string / object | **Optional** | Initial map center latitude (see [Location Coordinates](#location-coordinates)) | HA instance location |
| center_longitude | number / string / object | **Optional** | Initial map center longitude | HA instance location |
| marker_latitude | number / string / object | **Optional** | Latitude for the home marker (see [Location Coordinates](#location-coordinates)) | HA instance location |
| marker_longitude | number / string / object | **Optional** | Longitude for the home marker | HA instance location |
| mobile_center_latitude | number / string / object | **Optional** | Mobile override for center latitude (see [Mobile Device Overrides](#mobile-device-overrides)) | not set |
| mobile_center_longitude | number / string / object | **Optional** | Mobile override for center longitude | not set |
| mobile_marker_latitude | number / string / object | **Optional** | Mobile override for marker latitude | not set |
| mobile_marker_longitude | number / string / object | **Optional** | Mobile override for marker longitude | not set |
| frame_count | number | **Optional** | Number of frames in the loop | `5` |
| frame_delay | number | **Optional** | Milliseconds to display each frame | `500` |
| restart_delay | number | **Optional** | Extra milliseconds to hold the last frame before looping | `1000` |
| animated_transitions | boolean | **Optional** | Enable crossfade transitions between frames | `true` |
| transition_time | number | **Optional** | Crossfade duration in ms. Default is 40% of frame_delay | auto |
| show_snow | boolean | **Optional** | Include snow in the precipitation display (RainViewer only) | `false` |
| static_map | boolean | **Optional** | Disable all panning and zooming | `false` |
| show_zoom | boolean | **Optional** | Show zoom controls | `false` |
| square_map | boolean | **Optional** | Keep the map square | `false` |
| height | string | **Optional** | Custom card height using CSS units e.g. `'400px'`, `'50vh'` | `'400px'` |
| width | string | **Optional** | Custom card width using CSS units e.g. `'500px'`, `'80%'` | `'100%'` |
| show_marker | boolean | **Optional** | Show the home marker | `false` |
| marker_icon | string | **Optional** | Marker icon type: `'default'`, `'entity_picture'`, or `'mdi:icon-name'` | `'default'` |
| marker_icon_entity | string | **Optional** | Entity ID for the `entity_picture` marker icon | auto-detected |
| mobile_marker_icon | string | **Optional** | Mobile override for marker icon type | same as `marker_icon` |
| mobile_marker_icon_entity | string | **Optional** | Entity ID for mobile `entity_picture` icon | auto-detected |
| show_playback | boolean | **Optional** | Show playback controls toolbar | `false` |
| show_recenter | boolean | **Optional** | Show re-center button in toolbar | `false` |
| show_range | boolean | **Optional** | Show range rings around marker | `false` |
| extra_labels | boolean | **Optional** | Show more place labels (labels become smaller) | `false` |

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
| `Light` | CARTO Light — English only |
| `Dark` | CARTO Dark — English only |
| `Voyager` | CARTO Voyager — English only |
| `Satellite` | ESRI World Imagery — English only |
| `OSM` | OpenStreetMap — labels rendered in local language |

The default map style is `Light` for English-language HA instances and `OSM` for all others.

> **OpenStreetMap note:** OSM tiles are provided by the OpenStreetMap community. For high-traffic deployments please consider the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

### Animation

Each frame is a Leaflet tile layer. The card loads all frames simultaneously (newest first) and switches between them using JavaScript-driven opacity changes. This approach works reliably in Shadow DOM without any CSS cascade or reflow interactions.

**Crossfade (animated_transitions: true):**

When one frame fades out and the next fades in, the outgoing frame's `opacity` transitions to `0` and the incoming frame's transitions to `1` simultaneously over `transition_time` milliseconds, producing a smooth crossfade.

**Hard cut (animated_transitions: false):**

Opacity changes are instant — no transition property is applied.

**Automatic pause:**

- Animation pauses when the card is scrolled out of view or the browser tab is hidden, and resumes when visible again.
- During map navigation (panning or zooming), only the latest single frame is loaded to reduce tile requests. Full frame history is restored 100 ms after the map settles.

### Location Coordinates

The card supports three ways to specify latitude and longitude for center and marker positions.

#### 1. Static Numeric Values

```yaml
center_latitude: -25.567607
center_longitude: 152.930597
```

#### 2. Entity Reference

Use an entity ID. The card uses the entity's `latitude` and `longitude` attributes:

```yaml
marker_latitude: "device_tracker.my_phone"
marker_longitude: "device_tracker.my_phone"
```

Works with `device_tracker.*`, `person.*`, `zone.*`, or any entity with location attributes.

#### 3. Entity Reference with Custom Attributes

```yaml
marker_latitude:
  entity: sensor.custom_location
  latitude_attribute: custom_lat
marker_longitude:
  entity: sensor.custom_location
  longitude_attribute: custom_lon
```

> Coordinates are resolved when the card renders. Reload the card to update entity-based coordinates.

### Mobile Device Overrides

Different coordinates can be shown on mobile vs desktop. Useful for showing your home on desktop while showing your device's current location on mobile.

Mobile is detected via:

- Home Assistant Companion app user agent
- Mobile user agent strings
- Screen width ≤ 768px

Fields: `mobile_center_latitude`, `mobile_center_longitude`, `mobile_marker_latitude`, `mobile_marker_longitude`

If not set, base coordinates are used on all devices.

## Samples

Basic radar loop centred on a location:

```yaml
type: 'custom:weather-radar-card'
frame_count: 10
center_latitude: -25.567607
center_longitude: 152.930597
marker_latitude: -26.175328
marker_longitude: 152.653189
show_marker: true
show_range: true
show_zoom: true
show_recenter: true
show_playback: true
zoom_level: 8
```

Dense loop showing 24 hours of radar:

```yaml
type: 'custom:weather-radar-card'
frame_count: 144
frame_delay: 100
marker_latitude: -33.857058
marker_longitude: 151.215179
show_marker: true
show_range: false
```

Custom card dimensions:

```yaml
type: 'custom:weather-radar-card'
height: '400px'
width: '600px'
show_marker: true
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
show_marker: true
```

Mobile device overrides — desktop shows home, mobile shows current location:

```yaml
type: 'custom:weather-radar-card'
center_latitude: -25.567607
center_longitude: 152.930597
mobile_center_latitude: "device_tracker.my_phone"
mobile_center_longitude: "device_tracker.my_phone"
show_marker: true
show_range: true
zoom_level: 8
```

Tracking a person entity on all devices:

```yaml
type: 'custom:weather-radar-card'
center_latitude: "person.john"
center_longitude: "person.john"
marker_latitude: "person.john"
marker_longitude: "person.john"
show_marker: true
show_range: true
show_recenter: true
zoom_level: 9
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
