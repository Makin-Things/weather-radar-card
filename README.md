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

This card displays animated weather radar loops within Home Assistant. It supports multiple radar data sources and map styles, and can be zoomed and panned seamlessly. The animation is driven entirely by CSS keyframes for smooth, efficient transitions.

![Weather Radar card](https://raw.githubusercontent.com/makin-things/weather-radar-card/master/weather-radar-card.gif)

## Options

All options can be configured using the GUI editor — there is no need to edit YAML directly.

| Name | Type | Requirement | Description | Default |
| ---- | ---- | ----------- | ----------- | ------- |
| type | string | **Required** | | must be `'custom:weather-radar-card'` |
| card_title | string | **Optional** | Title displayed on the card | no title |
| data_source | string | **Optional** | Radar tile source (see [Data Source](#data-source)) | `'RainViewer'` |
| map_style | string | **Optional** | Map style (see [Map Style](#map-style)) | `'Light'` |
| zoom_level | number | **Optional** | Initial zoom level, 3–10 | `7` |
| center_latitude | number / string / object | **Optional** | Initial map center latitude (see [Location Coordinates](#location-coordinates)) | HA instance location |
| center_longitude | number / string / object | **Optional** | Initial map center longitude | HA instance location |
| marker_latitude | number / string / object | **Optional** | Latitude for the home marker (see [Location Coordinates](#location-coordinates)) | same as center_latitude |
| marker_longitude | number / string / object | **Optional** | Longitude for the home marker | same as center_longitude |
| mobile_center_latitude | number / string / object | **Optional** | Mobile override for center latitude (see [Mobile Device Overrides](#mobile-device-overrides)) | not set |
| mobile_center_longitude | number / string / object | **Optional** | Mobile override for center longitude | not set |
| mobile_marker_latitude | number / string / object | **Optional** | Mobile override for marker latitude | not set |
| mobile_marker_longitude | number / string / object | **Optional** | Mobile override for marker longitude | not set |
| frame_count | number | **Optional** | Number of frames in the loop | `5` |
| frame_delay | number | **Optional** | Milliseconds to display each frame | `500` |
| restart_delay | number | **Optional** | Extra milliseconds to hold the last frame before looping | `1000` |
| animated_transitions | boolean | **Optional** | Enable crossfade transitions between frames | `true` |
| transition_time | number | **Optional** | Total crossfade duration in ms (max: frame_delay). Default is 40% of frame_delay | auto |
| static_map | boolean | **Optional** | Disable all panning and zooming | `false` |
| show_zoom | boolean | **Optional** | Show zoom controls | `false` |
| square_map | boolean | **Optional** | Keep the map square (not in panel mode) | `false` |
| height | string | **Optional** | Custom card height using CSS units e.g. `'400px'`, `'50vh'` | auto |
| width | string | **Optional** | Custom card width using CSS units e.g. `'500px'`, `'80%'` | `'100%'` |
| show_marker | boolean | **Optional** | Show the home marker | `false` |
| show_playback | boolean | **Optional** | Show playback controls toolbar | `false` |
| show_recenter | boolean | **Optional** | Show re-center button in toolbar | `false` |
| show_scale | boolean | **Optional** | Show scale bar | `false` |
| show_range | boolean | **Optional** | Show range rings around marker | `false` |
| extra_labels | boolean | **Optional** | Show more place labels (labels become smaller) | `false` |

### Data Source

Selects where radar tile data comes from.

| Value | Coverage | Notes |
| ----- | -------- | ----- |
| `RainViewer` | Global | Default. Updated every 5 minutes, ~1–6 minute lag. No API key required. Personal/educational use only per RainViewer terms. |
| `NOAA` | US only | Experimental. Uses NOAA/NWS MRMS base reflectivity composite via `mapservices.weather.noaa.gov`. Government data — free, no API key. 15-minute lag, 5-minute frame steps. |

> **NOAA note:** This is an experimental feature using a public government service with no documented rate limits. It is US-only. The map is allowed to zoom to level 10 when NOAA is selected, but radar tiles are fetched at a maximum of zoom 7 (the native 1 km MRMS resolution) and upscaled for display.

### Map Style

Specifies the base map style. All CARTO-based styles render labels in English only. Use OpenStreetMap for localized labels.

| Value | Description |
| ----- | ----------- |
| `Light` | CARTO Light (default) — English only |
| `Dark` | CARTO Dark — English only |
| `Voyager` | CARTO Voyager — English only |
| `Satellite` | ESRI World Imagery — English only |
| `OSM` | OpenStreetMap — labels rendered in local language |

> **OpenStreetMap note:** OSM tiles are provided by the OpenStreetMap community. For high-traffic deployments please consider the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

### Animation

The card uses CSS `@keyframes` animation for smooth, efficient frame transitions. The animation is generated once from your config settings and runs entirely in CSS — no JavaScript runs on each frame.

**Crossfade behaviour (animated_transitions: true):**

- The incoming frame fades in over half the transition time
- At the midpoint both frames are fully visible simultaneously
- The outgoing frame fades out over the second half
- The last frame holds fully visible through the restart delay, then the loop cuts back to frame 1 instantly

**Hard cut (animated_transitions: false):**

- Frames switch instantly with no fade — uses CSS `step-end` timing for true hard cuts

**Automatic pause:**

- Animation pauses while the card is scrolled out of view or the browser tab is hidden, resuming when it becomes visible again
- Animation also pauses while navigating (panning/zooming). During navigation only the latest single frame is loaded to reduce tile requests. Full frame history is restored 5 seconds after navigation settles

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

If you use HACS, the card is part of the default HACS store.

If you don't use HACS, download the files from the [latest release](https://github.com/makin-things/weather-radar-card/releases) and place them in `www/community/weather-radar-card` in your `config` directory:

```
└── configuration.yaml
└── www
    └── community
        └── weather-radar-card
            └── weather-radar-card.js
            └── home-circle-dark.svg
            └── home-circle-light.svg
            └── leaflet.css
            └── leaflet.js
            └── leaflet.toolbar.min.css
            └── leaflet.toolbar.min.js
            └── pause.png
            └── play.png
            └── radar-colour-bar-universalblue.png
            └── recenter.png
            └── skip-back.png
            └── skip-next.png
```

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
