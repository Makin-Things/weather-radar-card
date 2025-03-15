# ***** New Maintainer *****

Update 2025-03-14: Simon has accepted my offer to take over maintenance of this card - [John Pettitt](https://github.com/jpettitt).  

I plan to triage the open issues over the next few weeks and identify any needed fixes and desired enhancements.


# Weather Radar Card

A Home Assistant rain radar card using the tiled images from RainViewer

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE)
![Maintenance](https://img.shields.io/maintenance/yes/2025?style=for-the-badge)

## Support

Hey dude! Help me out for a couple of :beers: or a :coffee:!

[![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/theOzzieRat)

## Description

This card uses map tiles of radar data provided by RainViewer. This allows for one continous map that can be zoomed and panned seamlessly. This card allows this to be displayed within Home Assistant. The card allows you create radar loops of up to at least 24 hours.

![Weather Radar card](https://raw.githubusercontent.com/makin-things/weather-radar-card/master/weather-radar-card.gif)

## Options

All of the options below can be selected using the GUI config editor, there is no need to edit the yaml config directly.

| Name             | Type    | Requirement  | Description                                                  | Default                                                    |
| ---------------- | ------- | ------------ | ------------------------------------------------------------ | ---------------------------------------------------------- |
| type             | string  | **Required** |                                                              | must be `'custom:weather-radar-card'`                      |
| card_title       | string  | **Optional** | The title to display on the card                             | no title displayed                                         |
| data_source      | string  | **Optional** | Specifies whcih set of radar tiles to use                    | `'RainViewer-Original'` see section below for valid values |
| map_style        | string  | **Optional** | Specifies the style for the map                              | `'light'` see section below for valid values               |
| zoom_level       | number  | **Optional** | The initial zoom level, can be from 4 to 10                  | `7`                                                        |
| center_latitude  | number  | **Optional** | The initial center latitude of the map                       | the location of your HA instance                           |
| center_longitude | number  | **Optional** | The initial center longitude of the map                      | the location of your HA instance                           |
| marker_latitude  | number  | **Optional** | The latitude for the home icon if enabled                    | the same as center_latitude                                |
| marker_longitude | number  | **Optional** | The longitude for the home icon if enabled                   | the same as center_longitude                               |
| frame_count      | number  | **Optional** | The number of frames to use in the loop                      | `10`                                                       |
| frame_delay      | number  | **Optional** | The number of milliseconds to show each frame                | `500`                                                      |
| restart_delay    | number  | **Optional** | The additional number of milliseconds to show the last frame | `1000`                                                     |
| static_map       | boolean | **Optional** | Set to true to disable all panning and zooming               | `false`                                                    |
| show_zoom        | boolean | **Optional** | Show the zoom controls in the top left corner                | `false`                                                    |
| square_map       | boolean | **Optional** | Will keep the map square (not in panel mode)                 | `false`                                                    |
| show_marker      | boolean | **Optional** | Show the home icon at the marker position                    | `false`                                                    |
| show_playback    | boolean | **Optional** | Show the playback controls in the bottom right toolbar       | `false`                                                    |
| show_recenter    | boolean | **Optional** | Show the re-center control in the bottom right toolbar       | `false`                                                    |
| show_scale       | boolean | **Optional** | Show a scale in the bottom left corner                       | `false`                                                    |
| show_range       | boolean | **Optional** | Show range rings around marker position                      | `false`                                                    |
| extra_labels     | boolean | **Optional** | Show more town labels (labels become smaller)                | `false`                                                    |

### Data Source

The RainViewer tiles are updated every 5 minutes with a lag of just one minute (ie. the most recent image is between 1 and 6 minutes old).
The valid values for this field are:

- RainViewer-Original
- RainViewer-UniversalBlue
- RainViewer-TITAN
- RainViewer-TWC
- RainViewer-Meteored
- RainViewer-NEXRAD
- RainViewer-Rainbow
- RainViewer-DarkSky

### Map style

Specifies the style of map to use. Valid values are:

- light
- dark
- voyager
- satellite

These are based off the Carto and ESRI map styles that are available.

## Samples

This is the configuration used to generate the radar loop on this page.

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

This will display a radar for the whole of Australia showing the previous 24 hours of radar images with a 100mSec delay between frames.

```yaml
type: 'custom:weather-radar-card'
frame_count: 144
frame_delay: 100
marker_latitude: -33.857058
marker_longitude: 151.215179
show_marker: true
show_range: false
```

## Install

If you use HACS, the card is now part of the default HACS store.

If you don't use HACS (seriously you should as it makes life so much easier), you can download the required files from [latest releases](https://github.com/makin-things/weather-radar-card/releases). Drop all of the files in `www/community/weather-radar-card` folder in your `config` directory. It should look like this:

```
    └── ...
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
                └── radar-colour-bar-darksky.png
                └── radar-colour-bar-meteored.png
                └── radar-colour-bar-nexrad.png
                └── radar-colour-bar-original.png
                └── radar-colour-bar-rainbow.png
                └── radar-colour-bar-titan.png
                └── radar-colour-bar-twc.png
                └── radar-colour-bar-universalblue.png
                └── recenter.png
                └── skip-back.png
                └── skip-next.png
```

Next add the following entry in lovelace configuration:

```yaml
resources:
  - url: /local/community/weather-radar-card/weather-radar-card.js
    type: module
```

[license-shield]: https://img.shields.io/github/license/makin-things/weather-radar-card.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/makin-things/weather-radar-card.svg?style=for-the-badge
[releases]: https://github.com/makin-things/weather-radar-card/releases
