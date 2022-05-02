import { LitElement, html, css, CSSResult, TemplateResult } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor, LovelaceCard } from 'custom-card-helpers';

import './editor';

import { WeatherRadarCardConfig } from './types';
import { CARD_VERSION } from './const';

import { localize } from './localize/localize';

/* eslint no-console: 0 */
console.info(
  `%c  WEATHER-RADAR-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).customCards = (window as any).customCards || [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).customCards.push({
  type: 'weather-radar-card',
  name: 'Weather Radar Card',
  description: 'A rain radar card using the new tiled images from RainViewer',
});

// TODO Name your custom element
@customElement('weather-radar-card')
export class WeatherRadarCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('weather-radar-card-editor') as LovelaceCardEditor;
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  @property({ type: Boolean, reflect: true })
  public isPanel = false;

  // TODO Add any properities that should cause your element to re-render here
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config!: WeatherRadarCardConfig;
  @property({ attribute: false }) public editMode?: boolean;

  public setConfig(config: WeatherRadarCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    /*   if (!config || config.show_error) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }*/

    this._config = config;
  }

  // #####
  // ##### Sets the card size so HA knows how to put in columns
  // #####

  getCardSize(): number {
    return 10;
  }

  protected shouldUpdate(/*changedProps: PropertyValues*/): boolean {
    return true;
    //    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  protected render(): TemplateResult | void {
    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (this._config.show_warning) {
      return this.showWarning(localize('common.show_warning'));
    }

    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Weather Radar Card</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" href="/local/community/weather-radar-card/leaflet.css"/>
          <link rel="stylesheet" href="/local/community/weather-radar-card/leaflet.toolbar.min.css"/>
          <script src="/local/community/weather-radar-card/leaflet.js"></script>
          <script src="/local/community/weather-radar-card/leaflet.toolbar.min.js"></script>
          <style>
            body {
              margin: 0;
              padding: 0;
            }
            .text-container {
              font: 12px/1.5 'Helvetica Neue', Arial, Helvetica, sans-serif;
              margin: 0px 2.5px 0px 10px;
            }
            .text-container-small {
              font: 10px/1.5 'Helvetica Neue', Arial, Helvetica, sans-serif;
              margin: 0px 10px 0px 2.5px;
            }
            .light-links a {
              color: blue;
            }
            .dark-links a {
              color: steelblue;
            }
            #timestamp {
              margin: 0px 0px;
            }
            #color-bar {
              margin: 0px 0px;
            }
          </style>
        </head>
        <body onresize="resizeWindow()">
          <span>
            <div id="color-bar" style="height: 8px;">
              <img id="img-color-bar" height="8" style="vertical-align: top" />
            </div>
            <div id="mapid" style="height: ${this.isPanel
        ? this.offsetParent
          ? this.offsetParent.clientHeight - 34 - (this.editMode === true ? 59 : 0) + `px`
          : `526px`
        : this._config.square_map !== undefined
          ? this._config.square_map
            ? this.getBoundingClientRect().width + 'px'
            : '492px'
          : '492px'
      };"></div>
            <div id="div-progress-bar" style="height: 8px; background-color: white;">
              <div id="progress-bar" style="height:8px;width:0; background-color: #ccf2ff;"></div>
            </div>
            <div id="bottom-container" class="light-links" style="height: 18px; background-color: white;">
              <div id="timestampid" class="text-container" style="width: 110px; height: 18px; float:left; position: absolute;">
                <p id="timestamp"></p>
              </div>
              <div id="attribution" class="text-container-small" style="height: 18px; float:right;">
                <span class="Map__Attribution-LjffR DKiFh" id="attribution"
                  ></span
                >
              </div>
            </div>
            <script>
              const radarLocations = [
                [-29.971116, 146.813845, "Brewarrina"],
                [-35.661387, 149.512229, "Canberra (Captain's Flat)"],
                [-29.620633, 152.963328, "Grafton"],
                [-33.552222, 145.528610, "Hillston"],
                [-29.496994, 149.850825, "Moree"],
                [-31.024219, 150.192037, "Namoi (BlackJack Mountain)"],
                [-32.729802, 152.025422, "Newcastle"],
                [-29.038524, 167.941679, "Norfolk Island"],
                [-33.700764, 151.209470, "Sydney (Terry Hills)"],
                [-35.158170, 147.456307, "Wagga Wagga"],
                [-34.262389, 150.875099, "Wollongong (Appin)"],
                [-37.855210, 144.755512, "Melbourne"],
                [-34.287096, 141.598250, "Mildura"],
                [-37.887532, 147.575475, "Bairnsdale"],
                [-35.997652, 142.013441, "Rainbow"],
                [-36.029663, 146.022772, "Yarrawonga"],
                [-19.885737, 148.075693, "Bowen"],
                [-27.717739, 153.240015, "Brisbane (Mt Stapylton)"],
                [-16.818145, 145.662895, "Cairns"],
                [-23.549558, 148.239166, "Emerald (Central Highlands)"],
                [-23.855056, 151.262567, "Gladstone"],
                [-18.995000, 144.995000, "Greenvale"],
                [-25.957342, 152.576898, "Gympie (Mt Kanigan)"],
                [-23.439783, 144.282270, "Longreach"],
                [-21.117243, 149.217213, "Mackay"],
                [-27.606344, 152.540084, "Marburg"],
                [-16.670000, 139.170000, "Mornington Island"],
                [-20.711204, 139.555281, "Mount Isa"],
                [-25.696071, 149.898161, "Taroom"],
                [-19.419800, 146.550974, "Townsville (Hervey Range)"],
                [-26.440193, 147.349130, "Warrego"],
                [-12.666413, 141.924640, "Weipa"],
                [-16.287199, 149.964539, "Willis Island"],
                [-34.617016, 138.468782, "Adelaide (Buckland Park)"],
                [-35.329531, 138.502498, "Adelaide (Sellicks Hill)"],
                [-32.129823, 133.696361, "Ceduna"],
                [-37.747713, 140.774605, "Mt Gambier"],
                [-31.155811, 136.804400, "Woomera"],
                [-43.112593, 147.805241, "Hobart (Mt Koonya)"],
                [-41.179147, 145.579986, "West Takone"],
                [-23.795064, 133.888935, "Alice Springs"],
                [-12.455933, 130.926599, "Darwin/Berrimah"],
                [-12.274995, 136.819911, "Gove"],
                [-14.510918, 132.447010, "Katherine/Tindal"],
                [-11.648500, 133.379977, "Warruwi"],
                [-34.941838, 117.816370, "Albany"],
                [-17.948234, 122.235334, "Broome"],
                [-24.887978, 113.669386, "Carnarvon"],
                [-20.653613, 116.683144, "Dampier"],
                [-31.777795, 117.952768, "South Doodlakine"],
                [-33.830150, 121.891734, "Esperance"],
                [-28.804648, 114.697349, "Geraldton"],
                [-25.033225, 128.301756, "Giles"],
                [-18.228916, 127.662836, "Halls Creek"],
                [-30.784261, 121.454814, "Kalgoorlie-Boulder"],
                [-22.103197, 113.999698, "Learmonth"],
                [-33.096956, 119.008796, "Newdegate"],
                [-32.391761, 115.866955, "Perth (Serpentine)"],
                [-20.371845, 118.631670, "Port Hedland"],
                [-30.358887, 116.305769, "Watheroo"],
                [-15.451711, 128.120856, "Wyndham"]];
              const maxZoom = 10;
              const minZoom = 4;
              var radarOpacity = 1.0;
              var zoomLevel = ${this._config.zoom_level !== undefined ? this._config.zoom_level : 4};
              var centerLat = ${this._config.center_latitude !== undefined ? this._config.center_latitude : -27.85};
              var centerLon = ${this._config.center_longitude !== undefined ? this._config.center_longitude : 133.75};
              var markerLat = (${this._config.marker_latitude}) ? ${this._config.marker_latitude} : centerLat;
              var markerLon = (${this._config.marker_longitude}) ? ${this._config.marker_longitude} : centerLon;
              var timeout = ${this._config.frame_delay !== undefined ? this._config.frame_delay : 500};
              var restartDelay = ${this._config.restart_delay !== undefined ? this._config.restart_delay : 1000};
              var frameCount = ${this._config.frame_count != undefined ? this._config.frame_count : 10};
              var tileURL = '${this._config.data_source !== undefined ? this._config.data_source : 'BoM'}';
              switch (tileURL) {
                case "BoM":
                  var tileURL = 'https://radar-tiles.service.bom.gov.au/tiles/{time}/{z}/{x}/{y}.png';
                  document.getElementById("img-color-bar").src = "/local/community/weather-radar-card/radar-colour-bar-bom.png";
                  var framePeriod = 600000;
                  var frameLag = 600000;
                  break;
                case "RainViewer-Original":
                  var tileURL = 'https://tilecache.rainviewer.com/v2/radar/{time}/256/{z}/{x}/{y}/1/1_0.png';
                  document.getElementById("img-color-bar").src = "/local/community/weather-radar-card/radar-colour-bar-original.png";
                  var framePeriod = 300000;
                  var frameLag = 60000;
                  break;
                case "RainViewer-UniversalBlue":
                  var tileURL = 'https://tilecache.rainviewer.com/v2/radar/{time}/256/{z}/{x}/{y}/2/1_0.png';
                  document.getElementById("img-color-bar").src = "/local/community/weather-radar-card/radar-colour-bar-universalblue.png";
                  var framePeriod = 300000;
                  var frameLag = 60000;
                  break;
                case "RainViewer-TITAN":
                  var tileURL = 'https://tilecache.rainviewer.com/v2/radar/{time}/256/{z}/{x}/{y}/3/1_0.png';
                  document.getElementById("img-color-bar").src = "/local/community/weather-radar-card/radar-colour-bar-titan.png";
                  var framePeriod = 300000;
                  var frameLag = 60000;
                  break;
                case "RainViewer-TWC":
                  var tileURL = 'https://tilecache.rainviewer.com/v2/radar/{time}/256/{z}/{x}/{y}/4/1_0.png';
                  document.getElementById("img-color-bar").src = "/local/community/weather-radar-card/radar-colour-bar-twc.png";
                  var framePeriod = 300000;
                  var frameLag = 60000;
                  break;
                case "RainViewer-Meteored":
                  var tileURL = 'https://tilecache.rainviewer.com/v2/radar/{time}/256/{z}/{x}/{y}/5/1_0.png';
                  document.getElementById("img-color-bar").src = "/local/community/weather-radar-card/radar-colour-bar-meteored.png";
                  var framePeriod = 300000;
                  var frameLag = 60000;
                  break;
                case "RainViewer-NEXRAD":
                  var tileURL = 'https://tilecache.rainviewer.com/v2/radar/{time}/256/{z}/{x}/{y}/6/1_0.png';
                  document.getElementById("img-color-bar").src = "/local/community/weather-radar-card/radar-colour-bar-nexrad.png";
                  var framePeriod = 300000;
                  var frameLag = 60000;
                  break;
                case "RainViewer-Rainbow":
                  var tileURL = 'https://tilecache.rainviewer.com/v2/radar/{time}/256/{z}/{x}/{y}/7/1_0.png';
                  document.getElementById("img-color-bar").src = "/local/community/weather-radar-card/radar-colour-bar-rainbow.png";
                  var framePeriod = 300000;
                  var frameLag = 60000;
                  break;
                case "RainViewer-DarkSky":
                  var tileURL = 'https://tilecache.rainviewer.com/v2/radar/{time}/256/{z}/{x}/{y}/8/1_0.png';
                  document.getElementById("img-color-bar").src = "/local/community/weather-radar-card/radar-colour-bar-darksky.png";
                  var framePeriod = 300000;
                  var frameLag = 60000;
                  break;
              }
              resizeWindow();
              var labelSize = ${this._config.extra_labels !== undefined ? (this._config.extra_labels ? 128 : 256) : 256
      };
              var labelZoom = ${this._config.extra_labels !== undefined ? (this._config.extra_labels ? 1 : 0) : 0};
              var locationRadius = '${this._config.radar_location_radius !== undefined ? this._config.radar_location_radius : 2
      }';
              var locationLineColour = '${this._config.radar_location_line_colour !== undefined
        ? this._config.radar_location_line_colour
        : '#00FF00'
      }';
              var locationFillColour = '${this._config.radar_location_fill_colour !== undefined
        ? this._config.radar_location_fill_colour
        : '#FF0000'
      }';
              var map_style = '${this._config.map_style !== undefined ? this._config.map_style.toLowerCase() : 'light'
      }';
              switch (map_style) {
                case "dark":
                  var basemap_url = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
                  var basemap_style = 'dark_nolabels';
                  var label_url = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png';
                  var label_style = 'dark_only_labels';
                  var svg_icon = 'home-circle-light.svg';
                  var attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attribution" target="_blank">CARTO</a>';
                  break;
                case "voyager":
                  var basemap_url = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
                  var basemap_style = 'rastertiles/voyager_nolabels';
                  var label_url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png';
                  var label_style = 'rastertiles/voyager_only_labels';
                  var svg_icon = 'home-circle-dark.svg';
                  var attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attribution" target="_blank">CARTO</a>';
                  break;
                case 'satellite':
                  var basemap_url = 'https://server.arcgisonline.com/ArcGIS/rest/services/{style}/MapServer/tile/{z}/{y}/{x}';
                  var basemap_style = 'World_Imagery';
                  var label_url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png';
                  var label_style = 'proton_labels_std';
                  var svg_icon = 'home-circle-dark.svg';
                  var attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="http://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank">ESRI</a>';
                  break;
                case "light":
                default:
                  var basemap_url = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
                  var basemap_style = 'light_nolabels';
                  var label_url = 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png';
                  var label_style = 'light_only_labels';
                  var svg_icon = 'home-circle-dark.svg';
                  var attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attribution" target="_blank">CARTO</a>';
              }

              var idx = 0;
              var run = true;
              var doRadarUpdate = false;
              var radarMap = L.map('mapid', {
                zoomControl: ${this._config.show_zoom === true && this._config.static_map !== true ? 'true' : 'false'},
                ${this._config.static_map === true
        ? 'scrollWheelZoom: false, \
                doubleClickZoom: false, \
                boxZoom: false, \
                dragging: false, \
                keyboard: false, \
                touchZoom: false,'
        : 'wheelPxPerZoomLevel: 120,'
      }
                attributionControl: false,
                minZoom: minZoom,
                maxZoom: maxZoom,
                maxBounds: [
                  [0, 101.25],
                  [-55.77657, 168.75],
                ],
                maxBoundsViscosity: 1.0,
              }).setView([centerLat, centerLon], zoomLevel);
              var radarImage = [frameCount];
              var radarTime = [frameCount];
              var weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              var month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              var d = new Date();
              d.setTime(Math.trunc((d.valueOf() - frameLag) / framePeriod) * framePeriod - (frameCount - 1) * framePeriod);

              document.getElementById("progress-bar").style.width = barSize+"px";
              document.getElementById("attribution").innerHTML = attribution;

              var t2actions = [];

              if (${this._config.show_recenter === true && this._config.static_map !== true}) {
                var recenterAction = L.Toolbar2.Action.extend({
                  options: {
                      toolbarIcon: {
                          html: '<img src="/local/community/weather-radar-card/recenter.png" width="24" height="24">',
                          tooltip: 'Re-center'
                      }
                  },

                  addHooks: function () {
                    radarMap.setView([centerLat, centerLon], zoomLevel);
                  }
                });
                t2actions.push(recenterAction);
              }

              if (${this._config.show_playback === true}) {
                var playAction = L.Toolbar2.Action.extend({
                  options: {
                      toolbarIcon: {
                          html: '<img id="playButton" src="/local/community/weather-radar-card/pause.png" width="24" height="24">',
                          tooltip: 'Pause'
                      }
                  },

                  addHooks: function () {
                    run = !run;
                    if (run) {
                      document.getElementById("playButton").src = "/local/community/weather-radar-card/pause.png"
                    } else {
                      document.getElementById("playButton").src = "/local/community/weather-radar-card/play.png"
                    }
                  }
                });
                t2actions.push(playAction);

                var skipbackAction = L.Toolbar2.Action.extend({
                  options: {
                      toolbarIcon: {
                          html: '<img src="/local/community/weather-radar-card/skip-back.png" width="24" height="24">',
                          tooltip: 'Previous Frame'
                      }
                  },

                  addHooks: function () {
                    skipBack();
                  }
                });
                t2actions.push(skipbackAction);

                var skipnextAction = L.Toolbar2.Action.extend({
                  options: {
                      toolbarIcon: {
                          html: '<img src="/local/community/weather-radar-card/skip-next.png" width="24" height="24">',
                          tooltip: 'Next Frame'
                      }
                  },

                  addHooks: function () {
                    skipNext();
                  }
                });
                t2actions.push(skipnextAction);
              }

              if (t2actions.length > 0) {
                new L.Toolbar2.Control({
                  position: 'bottomright',
                  actions: t2actions
                }).addTo(radarMap);
              }

              if (${this._config.show_scale === true}) {
                L.control.scale({
                  position: 'bottomleft',
                  metric: true,
                  imperial: false,
                  maxWidth: 100,
                }).addTo(radarMap);

                if ((map_style === "dark") || (map_style == "satellite")) {
                  var scaleDiv = this.document.getElementsByClassName("leaflet-control-scale-line")[0];
                  scaleDiv.style.color = "#BBB";
                  scaleDiv.style.borderColor = "#BBB";
                  scaleDiv.style.background = "#00000080";
                }
              }

              if ((map_style === "dark") || (map_style == "satellite")) {
                this.document.getElementById("div-progress-bar").style.background = "#1C1C1C";
                this.document.getElementById("progress-bar").style.background = "steelblue";
                this.document.getElementById("bottom-container").style.background = "#1C1C1C";
                this.document.getElementById("bottom-container").style.color = "#DDDDDD";
                this.document.getElementById("bottom-container").className = "dark-links";
              }

              L.tileLayer(
                basemap_url,
                {
                  style: basemap_style,
                  subdomains: 'abcd',
                  detectRetina: true,
                  tileSize: 256,
                  zoomOffset: 0,
                },
              ).addTo(radarMap);

              for (i = 0; i < frameCount; i++) {
                if ((${this._config.data_source === undefined}) || (${this._config.data_source === "BoM"})) {
                  t = getRadarTime(d.valueOf() + i * framePeriod);
                } else {
                  t = d.valueOf()/1000 + i * (framePeriod/1000);
                }
                radarImage[i] = L.tileLayer(
                  tileURL,
                  {
                    time: t,
                    detectRetina: true,
                    tileSize: 256,
                    zoomOffset: 0,
                    opacity: 0,
                    frame: i,
                  },
                );
                radarTime[i] = getRadarTimeString(d.valueOf() + i * framePeriod);
              }

              for (i = 0; i < (frameCount - 1); i++) {
                radarImage[i].on('load', function(e) {
                  radarImage[e.target.options.frame + 1].addTo(radarMap);
                });
              }

              radarImage[0].addTo(radarMap);

              radarImage[idx].setOpacity(radarOpacity);
              document.getElementById('timestamp').innerHTML = radarTime[idx];
              d.setTime(d.valueOf() + (frameCount - 1) * framePeriod);

              townLayer = L.tileLayer(
                label_url,
                {
                  subdomains: 'abcd',
                  detectRetina: false,
                  tileSize: labelSize,
                  zoomOffset: labelZoom,
                },
              ).addTo(radarMap);
              townLayer.setZIndex(2);

              ${this._config.show_marker === true
        ? "var myIcon = L.icon({ \
                       iconUrl: '/local/community/weather-radar-card/'+svg_icon, \
                       iconSize: [16, 16], \
                     }); \
                     L.marker([markerLat, markerLon], { icon: myIcon, interactive: false }).addTo(radarMap);"
        : ''
      }

              ${this._config.show_range === true
        ? 'L.circle([markerLat, markerLon], { radius: 50000, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap); \
                     L.circle([markerLat, markerLon], { radius: 100000, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap); \
                     L.circle([markerLat, markerLon], { radius: 200000, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap);'
        : ''
      }

              ${this._config.show_radar_location === true
        ? "radarMap.createPane('overlayRadarLocation'); \
                     radarMap.getPane('overlayRadarLocation').style.zIndex = 401; \
                     radarMap.getPane('overlayRadarLocation').style.pointerEvents = 'none'; \
                     radarLocations.forEach(function (coords) { \
                       L.circleMarker([coords[0], coords[1]], { radius: locationRadius, weight: locationRadius/2, color: locationLineColour, fillColor: locationFillColour, fillOpacity: 1.0, interactive: false, pane: 'overlayRadarLocation' }).addTo(radarMap); \
                       L.circleMarker([coords[0], coords[1]], { radius: Math.max(10, locationRadius*1.5), stroke: false, fill: true, fillOpacity: 0.0, interactive: true, pane: 'overlayRadarLocation' }).addTo(radarMap).bindTooltip(coords[2]); \
                      });"
        : ''
      }

              ${this._config.show_radar_coverage === true
        ? "radarMap.createPane('overlayRadarCoverage'); \
                     radarMap.getPane('overlayRadarCoverage').style.opacity = 0.1; \
                     radarMap.getPane('overlayRadarCoverage').style.zIndex = 400; \
                     radarMap.getPane('overlayRadarCoverage').style.pointerEvents = 'none'; \
                     radarLocations.forEach(function (coords) { \
                       L.circle([coords[0], coords[1]], { radius: 250000, weight: 1, stroke: false, fill: true, fillOpacity: 1, interactive: false, pane: 'overlayRadarCoverage' }).addTo(radarMap); \
                     });"
        : ''
      }

              setTimeout(function() {
                nextFrame();
              }, timeout);
              setUpdateTimeout();

              function setUpdateTimeout() {
                d.setTime(d.valueOf() + framePeriod);
                x = new Date();
                setTimeout(triggerRadarUpdate, d.valueOf() - x.valueOf() + frameLag);
              }

              function triggerRadarUpdate() {
                doRadarUpdate = true;
              }

              function updateRadar() {
                if ((${this._config.data_source === undefined}) || (${this._config.data_source === "BoM"})) {
                  t = getRadarTime(d.valueOf());
                } else {
                  t = d.valueOf()/1000;
                }
                newLayer = L.tileLayer(tileURL, {
                  time: t,
                  maxZoom: maxZoom,
                  tileSize: 256,
                  zoomOffset: 0,
                  opacity: 0,
                });
                newLayer.addTo(radarMap);
                newTime = getRadarTimeString(d.valueOf());

                radarImage[0].remove();
                for (i = 0; i < frameCount - 1; i++) {
                  radarImage[i] = radarImage[i + 1];
                  radarTime[i] = radarTime[i + 1];
                }
                radarImage[frameCount - 1] = newLayer;
                radarTime[frameCount - 1] = newTime;
                idx = 0;
                doRadarUpdate = false;

                setUpdateTimeout();
              }

              function getRadarTime(date) {
                x = new Date(date);
                return (
                  x.getUTCFullYear().toString() +
                  (x.getUTCMonth() + 1).toString().padStart(2, '0') +
                  x
                    .getUTCDate()
                    .toString()
                    .padStart(2, '0') +
                  x
                    .getUTCHours()
                    .toString()
                    .padStart(2, '0') +
                  x
                    .getUTCMinutes()
                    .toString()
                    .padStart(2, '0')
                );
              }

              function getRadarTimeString(date) {
                x = new Date(date);
                return (
                  weekday[x.getDay()] +
                  ' ' +
                  month[x.getMonth()] +
                  ' ' +
                  x
                    .getDate()
                    .toString()
                    .padStart(2, '0') +
                  ' ' +
                  x
                    .getHours()
                    .toString()
                    .padStart(2, '0') +
                  ':' +
                  x
                    .getMinutes()
                    .toString()
                    .padStart(2, '0')
                );
              }

              function nextFrame() {
                if (run) {
                  nextImage();
                }
                setTimeout(function() {
                  nextFrame();
                }, (idx == frameCount) ? restartDelay : timeout);
              }

              function skipNext() {
                if (idx == frameCount-1) {
                  idx += 1;
                }
                nextImage();
              }

              function skipBack() {
                if (idx == frameCount) {
                  radarImage[frameCount - 1].setOpacity(0);
                  idx -= 1;
                } else if (idx < frameCount) {
                  radarImage[idx].setOpacity(0);
                }
                idx -= 1;
                if (doRadarUpdate && idx == 1) {
                  updateRadar();
                }
                if (idx < 0) {
                  idx = frameCount-1;
                }
                document.getElementById("progress-bar").style.width = (idx+1)*barSize+"px";
                document.getElementById('timestamp').innerHTML = radarTime[idx];
                radarImage[idx].setOpacity(radarOpacity);
              }

              function nextImage() {
                if (idx == frameCount) {
                  radarImage[frameCount - 1].setOpacity(0);
                } else if (idx < frameCount - 1) {
                  radarImage[idx].setOpacity(0);
                }
                idx += 1;
                if (doRadarUpdate && idx == 1) {
                  updateRadar();
                }
                if (idx == frameCount + 1) {
                  idx = 0;
                }
                if (idx != frameCount + 1) {
                  document.getElementById("progress-bar").style.width = (idx+1)*barSize+"px";
                }
                if (idx < frameCount) {
                  document.getElementById('timestamp').innerHTML = radarTime[idx];
                  radarImage[idx].setOpacity(radarOpacity);
                }
              }

              function resizeWindow() {
                this.document.getElementById("color-bar").width = this.frameElement.offsetWidth;
                this.document.getElementById("img-color-bar").width = this.frameElement.offsetWidth;
                this.document.getElementById("mapid").width = this.frameElement.offsetWidth;
                this.document.getElementById("mapid").height = ${this.isPanel
        ? this.offsetParent
          ? this.offsetParent.clientHeight - 34 - (this.editMode === true ? 59 : 0)
          : 492
        : this._config.square_map !== undefined
          ? this._config.square_map
            ? this.getBoundingClientRect().width
            : 492
          : 492
      }
                this.document.getElementById("div-progress-bar").width = this.frameElement.offsetWidth;
                this.document.getElementById("bottom-container").width = this.frameElement.offsetWidth;
                barSize = this.frameElement.offsetWidth/frameCount;
              }
            </script>
          </span>
        </body>
      </html>
    `;

    const padding = this.isPanel
      ? this.offsetParent
        ? this.offsetParent.clientHeight - (this.editMode === true ? 59 : 0) + `px`
        : `526px`
      : this._config.square_map !== undefined
        ? this._config.square_map
          ? `${this.getBoundingClientRect().width + 34}px`
          : `526px`
        : `526px`;

    return html`
      <style>
        ${this.styles}
      </style>
      <ha-card class="type-iframe">
        <div id="root" style="padding-top: ${padding}">
          <iframe srcdoc=${doc} scrolling="no"></iframe>
        </div>
      </ha-card>
    `;
  }

  private showWarning(warning: string): TemplateResult {
    return html`
      <hui-warning>${warning}</hui-warning>
    `;
  }

  private showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card') as LovelaceCard;
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this._config,
    });

    return html`
      ${errorCard}
    `;
  }

  get styles(): CSSResult {
    return css`
      .text-container {
        font: 12px/1.5 'Helvetica Neue', Arial, Helvetica, sans-serif;
      }
      #timestamp {
        margin: 2px 0px;
      }
      #color-bar {
        margin: 0px 0px;
      }
      ha-card {
        overflow: hidden;
      }
      #root {
        width: 100%;
        position: relative;
      }
      iframe {
        position: absolute;
        border: none;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
      }
    `;
  }
}
