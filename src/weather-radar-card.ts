import { LitElement, html, css, CSSResult, TemplateResult, PropertyValues } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor, LovelaceCard } from 'custom-card-helpers';

import './editor';

import { WeatherRadarCardConfig, CoordinateConfig } from './types';
import { CARD_VERSION } from './const';

import { localize } from './localize/localize';

/* eslint no-console: 0 */
console.info(
  `%c  WEATHER-RADAR-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);
console.log('Weather Radar Card: Script loaded and registering...');

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

    if (config.height && config.square_map) {
      console.warn(
        "Weather Radar Card: Both 'height' and 'square_map' are configured. Custom height will take priority.",
      );
    }

    if (config.height && !this._validateCssSize(config.height)) {
      console.warn(
        `Weather Radar Card: Invalid height value '${config.height}'. Must be a number followed by a CSS unit (px, %, em, rem, vh, vw). Using default height.`,
      );
    }

    if (config.width && !this._validateCssSize(config.width)) {
      console.warn(
        `Weather Radar Card: Invalid width value '${config.width}'. Must be a number followed by a CSS unit (px, %, em, rem, vh, vw). Using default width.`,
      );
    }

    // Validate coordinate configurations
    this._validateCoordinateConfig('center_latitude', config.center_latitude);
    this._validateCoordinateConfig('center_longitude', config.center_longitude);
    this._validateCoordinateConfig('marker_latitude', config.marker_latitude);
    this._validateCoordinateConfig('marker_longitude', config.marker_longitude);
    this._validateCoordinateConfig('mobile_center_latitude', config.mobile_center_latitude);
    this._validateCoordinateConfig('mobile_center_longitude', config.mobile_center_longitude);
    this._validateCoordinateConfig('mobile_marker_latitude', config.mobile_marker_latitude);
    this._validateCoordinateConfig('mobile_marker_longitude', config.mobile_marker_longitude);

    this._config = config;
  }

  // #####
  // ##### Sets the card size so HA knows how to put in columns
  // #####

  getCardSize(): number {
    return 10;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    // Don't try to update if we don't have a config yet
    if (!this._config) {
      return false;
    }
    // Check if config or hass changed (this card doesn't use entity tracking)
    return changedProps.has('_config') || changedProps.has('hass');
  }

  /**
   * Validates coordinate configuration format
   * Logs warnings for invalid configs but doesn't throw errors
   */
  private _validateCoordinateConfig(fieldName: string, value: CoordinateConfig | undefined): void {
    if (value === undefined || value === null) {
      return; // Optional field
    }

    // Number is always valid
    if (typeof value === 'number') {
      return;
    }

    // String should look like an entity ID
    if (typeof value === 'string') {
      if (!value.includes('.')) {
        console.warn(
          `Weather Radar Card: '${fieldName}' value '${value}' does not look like a valid entity ID. Expected format: 'domain.entity_name'`,
        );
      }
      return;
    }

    // Object should have required fields
    if (typeof value === 'object') {
      if (!value.entity || typeof value.entity !== 'string') {
        console.warn(
          `Weather Radar Card: '${fieldName}' entity config missing required 'entity' field`,
        );
      }
      if (value.latitude_attribute && typeof value.latitude_attribute !== 'string') {
        console.warn(
          `Weather Radar Card: '${fieldName}' latitude_attribute must be a string`,
        );
      }
      if (value.longitude_attribute && typeof value.longitude_attribute !== 'string') {
        console.warn(
          `Weather Radar Card: '${fieldName}' longitude_attribute must be a string`,
        );
      }
      return;
    }

    console.warn(
      `Weather Radar Card: Invalid type for '${fieldName}'. Expected number, entity ID string, or entity config object.`,
    );
  }

  /**
   * Detects if the current device is mobile
   * Checks Home Assistant Companion app, mobile user agents, and screen width
   */
  private _isMobileDevice(): boolean {
    // Check 1: Home Assistant Companion app user agent
    const userAgent = navigator.userAgent.toLowerCase();
    const isHAApp = userAgent.includes('home assistant');

    // Check 2: Common mobile user agents
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    // Check 3: Screen width (mobile-sized)
    const isMobileScreen = window.innerWidth <= 768;

    // Device is mobile if: HA app, OR mobile screen size, OR mobile user agent
    // Screen size is the primary indicator - handles responsive design mode and small windows
    return isHAApp || isMobileScreen || isMobileUA;
  }

  /**
   * Gets info about the currently logged-in user including their person entity and device tracker
   * Returns null if user info cannot be determined
   */
  private _getCurrentUserInfo(): { personEntity: string; deviceTracker?: string } | null {
    const userId = this.hass?.user?.id;
    if (!userId) {
      return null;
    }

    // Search for person entity with matching user_id
    for (const [entityId, state] of Object.entries(this.hass?.states || {})) {
      if (entityId.startsWith('person.') && state.attributes?.user_id === userId) {
        // Found the person, get their primary device tracker
        let deviceTracker: string | undefined;
        const deviceTrackers = state.attributes?.device_trackers;

        if (Array.isArray(deviceTrackers) && deviceTrackers.length > 0) {
          deviceTracker = deviceTrackers[0];
        } else if (typeof deviceTrackers === 'string' && deviceTrackers) {
          // Could be comma-separated string
          deviceTracker = deviceTrackers.split(',')[0].trim();
        }

        return { personEntity: entityId, deviceTracker };
      }
    }

    return null;
  }

  /**
   * Returns appropriate coordinate config based on device type
   * Mobile overrides take precedence when device is detected as mobile
   * Auto-detects from current user's device tracker only when no coordinates are configured at all
   */
  private _getCoordinateConfig(
    baseConfig: CoordinateConfig | undefined,
    mobileConfig: CoordinateConfig | undefined,
    isMobile: boolean,
    userDeviceTracker?: string,
  ): CoordinateConfig | undefined {
    // If mobile and mobile override exists, use it
    if (isMobile && mobileConfig !== undefined) {
      return mobileConfig;
    }
    // If mobile with no override AND no base config, try auto-detect from user's device tracker.
    // Do NOT auto-detect when a base config is explicitly set - static coordinates must be respected.
    if (isMobile && !baseConfig && userDeviceTracker) {
      return userDeviceTracker;
    }
    // Otherwise use base config (including on mobile when base config is set)
    return baseConfig;
  }

  /**
   * Extracts coordinate from entity attributes with validation
   */
  private _getCoordinateFromEntity(
    entityId: string,
    coordType: 'latitude' | 'longitude',
    attributeName: string,
  ): number | null {
    // Check if entity exists
    const entityState = this.hass?.states[entityId];
    if (!entityState) {
      console.warn(
        `Weather Radar Card: Entity '${entityId}' not found for ${coordType}. Using fallback.`,
      );
      return null;
    }

    // Extract attribute value
    const value = entityState.attributes[attributeName];

    if (value === undefined || value === null) {
      console.warn(
        `Weather Radar Card: Entity '${entityId}' has no attribute '${attributeName}' for ${coordType}. Using fallback.`,
      );
      return null;
    }

    // Validate numeric value
    const numValue = typeof value === 'number' ? value : parseFloat(value);

    if (isNaN(numValue)) {
      console.warn(
        `Weather Radar Card: Entity '${entityId}' attribute '${attributeName}' is not a valid number ('${value}'). Using fallback.`,
      );
      return null;
    }

    // Validate coordinate ranges
    if (coordType === 'latitude' && (numValue < -90 || numValue > 90)) {
      console.warn(
        `Weather Radar Card: Invalid latitude value ${numValue} from entity '${entityId}'. Must be between -90 and 90. Using fallback.`,
      );
      return null;
    }

    if (coordType === 'longitude' && (numValue < -180 || numValue > 180)) {
      console.warn(
        `Weather Radar Card: Invalid longitude value ${numValue} from entity '${entityId}'. Must be between -180 and 180. Using fallback.`,
      );
      return null;
    }

    return numValue;
  }

  /**
   * Resolves a coordinate configuration to a numeric value
   * Supports: numbers, entity IDs as strings, or entity config objects
   */
  private _resolveCoordinate(
    config: CoordinateConfig | undefined,
    coordType: 'latitude' | 'longitude',
    fallback: number,
  ): number {
    // Return fallback if no config
    if (config === undefined || config === null) {
      return fallback;
    }

    // Direct numeric value (backwards compatible)
    if (typeof config === 'number') {
      return config;
    }

    // String entity ID (simple format)
    if (typeof config === 'string') {
      return (
        this._getCoordinateFromEntity(
          config,
          coordType,
          coordType, // Use coordType as attribute name
        ) ?? fallback
      );
    }

    // Entity config object (advanced format)
    if (typeof config === 'object' && 'entity' in config) {
      const attrName =
        coordType === 'latitude'
          ? config.latitude_attribute || 'latitude'
          : config.longitude_attribute || 'longitude';

      return this._getCoordinateFromEntity(config.entity, coordType, attrName) ?? fallback;
    }

    return fallback;
  }

  // Common MDI icon paths (embedded for offline reliability)
  private static readonly MDI_PATHS: Record<string, string> = {
    account:
      'M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z',
    'account-circle':
      'M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
    'map-marker':
      'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z',
    home: 'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z',
    car: 'M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z',
    cellphone:
      'M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z',
    'home-circle':
      'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M10,17V13H8L12,7L16,13H14V17H10Z',
  };

  /**
   * Finds the person entity that owns a given device tracker.
   * Searches all person entities for one whose device_trackers attribute includes the tracker ID.
   * Returns undefined if no matching person entity is found.
   */
  private _findPersonEntityForDeviceTracker(deviceTrackerId: string): string | undefined {
    for (const [entityId, state] of Object.entries(this.hass?.states || {})) {
      if (!entityId.startsWith('person.')) continue;
      const trackers = state.attributes?.device_trackers;
      if (Array.isArray(trackers) && trackers.includes(deviceTrackerId)) {
        return entityId;
      }
    }
    return undefined;
  }

  /**
   * Resolves an entity ID to a person entity suitable for entity_picture lookup.
   * If the entity is a device_tracker, finds its associated person entity.
   * Otherwise returns the entity ID unchanged.
   */
  private _resolveToPersonEntity(entityId: string): string {
    if (entityId.startsWith('device_tracker.')) {
      return this._findPersonEntityForDeviceTracker(entityId) ?? entityId;
    }
    return entityId;
  }

  /**
   * Gets the marker icon configuration based on device type.
   * Handles mobile overrides and auto-detection from configured coordinates.
   * Mobile defaults to entity_picture when no icon type is configured.
   */
  private _getMarkerIconConfig(isMobile: boolean, userInfo: { personEntity: string; deviceTracker?: string } | null): { type: string; entity?: string } {
    let iconType: string;
    if (isMobile) {
      // Mobile defaults to entity_picture when not explicitly configured
      iconType = this._config.mobile_marker_icon ?? 'entity_picture';
    } else {
      iconType = this._config.marker_icon || 'default';
    }

    // Use explicit icon entity if configured
    let iconEntity: string | undefined;
    if (isMobile) {
      iconEntity = this._config.mobile_marker_icon_entity;
    } else {
      iconEntity = this._config.marker_icon_entity;
    }

    // Auto-detect entity for entity_picture mode when no explicit entity is configured.
    // Priority: marker coordinate entity -> center coordinate entity -> logged-in user's person entity.
    // Device tracker entities are resolved to their associated person entity (which carries entity_picture).
    if (iconType === 'entity_picture' && !iconEntity) {
      // Priority 1: entity referenced by marker_latitude (marker position entity)
      const markerLatConfig = isMobile
        ? this._config.mobile_marker_latitude ?? this._config.marker_latitude
        : this._config.marker_latitude;

      if (typeof markerLatConfig === 'string') {
        iconEntity = this._resolveToPersonEntity(markerLatConfig);
      }

      // Priority 2: entity referenced by center_latitude (marker defaults to center when marker_latitude not set)
      if (!iconEntity) {
        const centerLatConfig = isMobile
          ? this._config.mobile_center_latitude ?? this._config.center_latitude
          : this._config.center_latitude;

        if (typeof centerLatConfig === 'string') {
          iconEntity = this._resolveToPersonEntity(centerLatConfig);
        }
      }

      // Priority 3: fall back to the logged-in user's person entity
      if (!iconEntity && userInfo?.personEntity) {
        iconEntity = userInfo.personEntity;
      }
    }

    return { type: iconType, entity: iconEntity };
  }

  /**
   * Resolves entity_picture URL from an entity
   */
  private _resolveEntityPicture(entityId: string | undefined): string | null {
    if (!entityId) return null;
    const entity = this.hass?.states[entityId];
    if (!entity?.attributes?.entity_picture) return null;
    return entity.attributes.entity_picture;
  }

  /**
   * Generates the JavaScript code for creating the Leaflet marker icon
   */
  private _generateMarkerIconCode(isMobile: boolean, userInfo: { personEntity: string; deviceTracker?: string } | null): string {
    const iconConfig = this._getMarkerIconConfig(isMobile, userInfo);
    const mapStyle = (this._config.map_style || 'light').toLowerCase();

    // Default icon (existing behavior)
    if (!iconConfig.type || iconConfig.type === 'default') {
      return `var myIcon = L.icon({
        iconUrl: '/local/community/weather-radar-card/'+svg_icon,
        iconSize: [16, 16],
      });`;
    }

    // Entity picture icon (circular avatar)
    if (iconConfig.type === 'entity_picture') {
      const pictureUrl = this._resolveEntityPicture(iconConfig.entity);
      if (!pictureUrl) {
        console.warn(
          `Weather Radar Card: Could not resolve entity_picture for '${iconConfig.entity}'. Using default icon.`,
        );
        return `var myIcon = L.icon({
          iconUrl: '/local/community/weather-radar-card/'+svg_icon,
          iconSize: [16, 16],
        });`;
      }
      // Escape quotes in URL for safety
      const safeUrl = pictureUrl.replace(/'/g, "\\'").replace(/"/g, '\\"');
      return `var myIcon = L.icon({
        iconUrl: '${safeUrl}',
        iconSize: [32, 32],
        className: 'marker-entity-picture'
      });`;
    }

    // MDI icon
    if (iconConfig.type.startsWith('mdi:')) {
      const iconName = iconConfig.type.substring(4); // Remove "mdi:" prefix
      const mdiPath = WeatherRadarCard.MDI_PATHS[iconName];

      if (!mdiPath) {
        console.warn(
          `Weather Radar Card: MDI icon '${iconName}' not found in embedded icons. Using default. ` +
            `Available icons: ${Object.keys(WeatherRadarCard.MDI_PATHS).join(', ')}`,
        );
        return `var myIcon = L.icon({
          iconUrl: '/local/community/weather-radar-card/'+svg_icon,
          iconSize: [16, 16],
        });`;
      }

      // Auto-select color based on map style (light icons on dark maps, dark icons on light maps)
      const mdiColor = mapStyle === 'dark' || mapStyle === 'satellite' ? '#EEEEEE' : '#333333';

      return `var myIcon = L.divIcon({
        html: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="${mdiColor}" d="${mdiPath}"/></svg>',
        iconSize: [24, 24],
        className: 'marker-mdi-icon'
      });`;
    }

    // Unknown icon type, fall back to default
    console.warn(`Weather Radar Card: Unknown marker_icon type '${iconConfig.type}'. Using default.`);
    return `var myIcon = L.icon({
      iconUrl: '/local/community/weather-radar-card/'+svg_icon,
      iconSize: [16, 16],
    });`;
  }

  /**
   * Resolves a lat/lon pair from configs with intelligent fallback handling
   * Special case: both are same entity string - extract both coordinates atomically
   */
  private _resolveCoordinatePair(
    latConfig: CoordinateConfig | undefined,
    lonConfig: CoordinateConfig | undefined,
    fallbackLat: number,
    fallbackLon: number,
  ): { lat: number; lon: number } {
    // Special case: both are string entity IDs and same entity
    // Extract both coordinates from same entity for atomic resolution
    if (typeof latConfig === 'string' && typeof lonConfig === 'string' && latConfig === lonConfig) {
      const entityState = this.hass?.states[latConfig];
      if (entityState?.attributes?.latitude && entityState?.attributes?.longitude) {
        const lat = parseFloat(entityState.attributes.latitude);
        const lon = parseFloat(entityState.attributes.longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          return { lat, lon };
        }
      }
    }

    // Standard resolution: resolve each coordinate independently
    return {
      lat: this._resolveCoordinate(latConfig, 'latitude', fallbackLat),
      lon: this._resolveCoordinate(lonConfig, 'longitude', fallbackLon),
    };
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
              font: 14px/1.5 'Helvetica Neue', Arial, Helvetica, sans-serif;
              margin: 0px 0px;
              padding-top: 5px;
            }
            #color-bar {
              margin: 0px 0px;
            }
            /* Custom marker icon styles */
            .marker-entity-picture {
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .marker-mdi-icon {
              background: transparent;
              border: none;
            }
          ${this._buildRadarKeyframesCSS()}
          </style>
        </head>
        <body onresize="resizeWindow()">
          <span>
            <div id="color-bar" style="height: 8px;">
              <img id="img-color-bar" height="8" style="vertical-align: top" />
            </div>
            <div id="nav-banner" style="display:none; position:absolute; top:8px; left:50%; transform:translateX(-50%); z-index:1000; background:rgba(0,0,0,0.65); color:#fff; padding:4px 12px; border-radius:4px; font:12px/1.5 'Helvetica Neue',Arial,sans-serif; pointer-events:none; white-space:nowrap;">Paused while Navigating</div>
            <div id="mapid" style="height: ${this._calculateHeight()};"></div>
            <div id="div-progress-bar" style="height: 8px; background-color: white;">
              <div id="progress-bar" style="height:8px;width:0; background-color: #ccf2ff;"></div>
            </div>
            <div id="bottom-container" class="light-links" style="height: 32px; background-color: white;">
              <div id="timestampid" class="text-container" style="width: 120px; height: 32px; float:left; position: absolute;">
                <p id="timestamp"></p>
              </div>
              <div id="attribution" class="text-container-small" style="height: 32px; float:right;">
                <span class="Map__Attribution-LjffR DKiFh" id="attribution"
                  ></span
                >
              </div>
            </div>
            <script>
              const tileSize = 256;
              const maxZoom = 10;
              const minZoom = 3;
              var radarOpacity = 1.0;
              var zoomLevel = ${JSON.stringify(this._config.zoom_level !== undefined ? this._config.zoom_level : 7)};
              ${
                (() => {
                  try {
                    // Detect device type and get current user info for auto-detection
                    const isMobile = this._isMobileDevice();
                    const userInfo = this._getCurrentUserInfo();

                    // Get coordinate configs - auto-detect from user's device tracker on mobile if no mobile config
                    const centerLatConfig = this._getCoordinateConfig(
                      this._config.center_latitude,
                      this._config.mobile_center_latitude,
                      isMobile,
                      userInfo?.deviceTracker,
                    );
                    const centerLonConfig = this._getCoordinateConfig(
                      this._config.center_longitude,
                      this._config.mobile_center_longitude,
                      isMobile,
                      userInfo?.deviceTracker,
                    );
                    const markerLatConfig = this._getCoordinateConfig(
                      this._config.marker_latitude,
                      this._config.mobile_marker_latitude,
                      isMobile,
                      userInfo?.deviceTracker,
                    );
                    const markerLonConfig = this._getCoordinateConfig(
                      this._config.marker_longitude,
                      this._config.mobile_marker_longitude,
                      isMobile,
                      userInfo?.deviceTracker,
                    );

                    // Resolve coordinates at render time
                    const centerCoords = this._resolveCoordinatePair(
                      centerLatConfig,
                      centerLonConfig,
                      this.hass?.config?.latitude ?? 0,
                      this.hass?.config?.longitude ?? 0,
                    );

                    const markerCoords = this._resolveCoordinatePair(
                      markerLatConfig,
                      markerLonConfig,
                      centerCoords.lat,
                      centerCoords.lon,
                    );

                    // Return variables for injection into iframe
                    return `var centerLat = ${JSON.stringify(centerCoords.lat)};
              var centerLon = ${JSON.stringify(centerCoords.lon)};
              var markerLat = ${JSON.stringify(markerCoords.lat)};
              var markerLon = ${JSON.stringify(markerCoords.lon)};`;
                  } catch (error) {
                    console.error('Weather Radar Card: Error resolving coordinates:', error);
                    // Fallback to default coordinates
                    const fallbackLat = this.hass?.config?.latitude ?? 0;
                    const fallbackLon = this.hass?.config?.longitude ?? 0;
                    return `var centerLat = ${JSON.stringify(fallbackLat)};
              var centerLon = ${JSON.stringify(fallbackLon)};
              var markerLat = ${JSON.stringify(fallbackLat)};
              var markerLon = ${JSON.stringify(fallbackLon)};`;
                  }
                })()
              }
              var timeout = ${JSON.stringify(this._config.frame_delay !== undefined ? this._config.frame_delay : 500)};
              var fadeMs = ${(() => {
                if (this._config.animated_transitions === false) return 0;
                if (this._config.transition_time !== undefined) return this._config.transition_time;
                return 'Math.floor(timeout * 0.4)';
              })()};
              var restartDelay = ${JSON.stringify(this._config.restart_delay !== undefined ? this._config.restart_delay : 1000)};
              var frameCount = ${JSON.stringify(this._config.frame_count != undefined ? this._config.frame_count : 5)}; 
              var tileURL = 'https://tilecache.rainviewer.com{path}/{tileSize}/{z}/{x}/{y}/2/1_0.png';
              var radarAPIURL = 'https://api.rainviewer.com/public/weather-maps.json';
              var noaaWmsURL = 'https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer';
              var noaaWmsLayer = 'radar_base_reflectivity_time';
              var dataSource = ${JSON.stringify(this._config.data_source || 'RainViewer')};
              var radarPaths = [];
              if (dataSource === 'NOAA') {
                document.getElementById("color-bar").style.display = 'none';
              } else {
                document.getElementById("img-color-bar").src = "/local/community/weather-radar-card/radar-colour-bar-universalblue.png";
              }
              var framePeriod = 300000;
              var frameLag = dataSource === 'NOAA' ? 0 : 60000;

              resizeWindow();
              var labelSize = ${JSON.stringify(this._config.extra_labels !== undefined ? (this._config.extra_labels ? 128 : 256) : 256)};
              var labelZoom = ${JSON.stringify(this._config.extra_labels !== undefined ? (this._config.extra_labels ? 1 : 0) : 0)};
              var map_style = ${JSON.stringify(this._config.map_style !== undefined && this._config.map_style !== null ? this._config.map_style.toLowerCase() : 'light')};
              var osmLabels = false;
              switch (map_style) {
                case "dark":
                  var basemap_url = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
                  var basemap_style = 'dark_nolabels';
                  var label_url = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png';
                  var label_style = 'dark_only_labels';
                  var svg_icon = 'home-circle-light.svg';
                  var attribution = '<a href="https://leafletjs.com" title="A JS library for interactive maps" target="_blank">Leaflet</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attribution" target="_blank">CARTO</a><br>Radar data by <a href="https://rainviewer.com" target="_blank">RainViewer</a>';
                  break;
                case "voyager":
                  var basemap_url = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
                  var basemap_style = 'rastertiles/voyager_nolabels';
                  var label_url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png';
                  var label_style = 'rastertiles/voyager_only_labels';
                  var svg_icon = 'home-circle-dark.svg';
                  var attribution = '<a href="https://leafletjs.com" title="A JS library for interactive maps" target="_blank">Leaflet</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attribution" target="_blank">CARTO</a><br>Radar data by <a href="https://rainviewer.com" target="_blank">RainViewer</a>';
                  break;
                case 'satellite':
                  var basemap_url = 'https://server.arcgisonline.com/ArcGIS/rest/services/{style}/MapServer/tile/{z}/{y}/{x}';
                  var basemap_style = 'World_Imagery';
                  var label_url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png';
                  var label_style = 'proton_labels_std';
                  var svg_icon = 'home-circle-dark.svg';
                  var attribution = '<a href="https://leafletjs.com" title="A JS library for interactive maps" target="_blank">Leaflet</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="http://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank">ESRI</a><br>Radar data by <a href="https://rainviewer.com" target="_blank">RainViewer</a>';
                  break;
                case "osm":
                  osmLabels = true;
                  var basemap_url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
                  var basemap_style = '';
                  var label_url = '';
                  var label_style = '';
                  var svg_icon = 'home-circle-dark.svg';
                  var attribution = '<a href="https://leafletjs.com" title="A JS library for interactive maps" target="_blank">Leaflet</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors<br>Radar data by <a href="https://rainviewer.com" target="_blank">RainViewer</a>';
                  break;
                case "light":
                default:
                  var basemap_url = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
                  var basemap_style = 'light_nolabels';
                  var label_url = 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png';
                  var label_style = 'light_only_labels';
                  var svg_icon = 'home-circle-dark.svg';
                  var attribution = '<a href="https://leafletjs.com" title="A JS library for interactive maps" target="_blank">Leaflet</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attribution" target="_blank">CARTO</a><br>Radar data by <a href="https://rainviewer.com" target="_blank">RainViewer</a>';
              }
              if (dataSource === 'NOAA') {
                attribution = attribution.replace('Radar data by <a href="https://rainviewer.com" target="_blank">RainViewer</a>', 'Radar data by <a href="https://www.weather.gov" target="_blank">NOAA/NWS</a>');
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
              }).setView([centerLat, centerLon], zoomLevel);

              var configFrameCount = frameCount;
              var navReloadTimer = null;
              var navRestoreTimer = null;
              var navPaused = false;

              var frameGeneration = 0;

              function clearRadarLayers() {
                frameGeneration++;
                radarReady = false;
                for (var fi = 0; fi < radarImage.length; fi++) {
                  if (radarImage[fi] && radarImage[fi].remove) radarImage[fi].remove();
                }
                radarImage = [];
                radarTime = [];
                idx = 0;
              }

              function loadSingleFrame() {
                clearRadarLayers();
                frameCount = 1;
                initRadar();
              }

              function onNavStart() {
                if (navReloadTimer) clearTimeout(navReloadTimer);
                if (navRestoreTimer) clearTimeout(navRestoreTimer);
                if (!navPaused) {
                  navPaused = true;
                  document.getElementById('nav-banner').style.display = 'block';
                  pauseAnimations();
                }
              }
              function onNavEnd() {
                if (navReloadTimer) clearTimeout(navReloadTimer);
                if (navRestoreTimer) clearTimeout(navRestoreTimer);
                // 250ms settle: reload single latest frame for current view
                navReloadTimer = setTimeout(function() {
                  loadSingleFrame();
                  // 5s after that: restore full history
                  navRestoreTimer = setTimeout(function() {
                    navPaused = false;
                    document.getElementById('nav-banner').style.display = 'none';
                    clearRadarLayers();
                    frameCount = configFrameCount;
                    initRadar();
                  }, 5000);
                }, 250);
              }
              radarMap.on('movestart zoomstart', onNavStart);
              radarMap.on('moveend zoomend', onNavEnd);

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
                      document.getElementById("playButton").src = "/local/community/weather-radar-card/pause.png";
                      resumeAnimations();
                    } else {
                      document.getElementById("playButton").src = "/local/community/weather-radar-card/play.png";
                      pauseAnimations();
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
                  metric: ${(this.hass?.config?.unit_system?.length ?? 'km') === 'km'},
                  imperial: ${(this.hass?.config?.unit_system?.length ?? 'km') === 'mi'},
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
                  detectRetina: false,
                  tileSize: tileSize,
                  zoomOffset: 0,
                },
              ).addTo(radarMap);

              async function fetchRadarPaths() {
                if (dataSource === 'NOAA') {
                  var frames = [];
                  var now = Date.now();
                  // Snap to 5-minute boundaries, lag 10 minutes to ensure data availability
                  var stepMs = 300000;
                  var lagMs = 900000;
                  var baseTime = Math.floor((now - lagMs) / stepMs) * stepMs;
                  for (var fi = frameCount - 1; fi >= 0; fi--) {
                    frames.push({ time: (baseTime - fi * stepMs) / 1000 });
                  }
                  return frames;
                }
                var response = await fetch(radarAPIURL);
                var data = await response.json();
                return data.radar.past;
              }

              function setLayerZIndex(layer, zIdx) {
                var el = layer.getContainer && layer.getContainer();
                if (el) el.style.zIndex = zIdx;
              }

              var animStartWallTime = null;
              var animPauseStartTime = null;
              var animAccPauseMs = 0;

              function getAnimElapsed() {
                var now = performance.now();
                var pendingPause = animPauseStartTime ? (now - animPauseStartTime) : 0;
                return now - animStartWallTime - animAccPauseMs - pendingPause;
              }

              function applyAnimations() {
                var totalMs = frameCount * timeout + restartDelay;
                animStartWallTime = performance.now();
                animAccPauseMs = 0;
                animPauseStartTime = null;
                for (var fi = 0; fi < frameCount; fi++) {
                  var el = radarImage[fi].getContainer && radarImage[fi].getContainer();
                  if (el) {
                    el.style.opacity = '0';
                    el.style.animation = 'radar-frame-' + fi + ' ' + totalMs + 'ms ' + (fadeMs === 0 ? 'step-end' : 'linear') + ' infinite';
                  }
                }
              }

              function setAnimPlayState(state) {
                for (var fi = 0; fi < radarImage.length; fi++) {
                  var el = radarImage[fi] && radarImage[fi].getContainer && radarImage[fi].getContainer();
                  if (el) el.style.animationPlayState = state;
                }
              }

              function pauseAnimations() {
                if (animPauseStartTime) return;
                animPauseStartTime = performance.now();
                setAnimPlayState('paused');
              }

              function resumeAnimations() {
                if (animPauseStartTime) {
                  animAccPauseMs += performance.now() - animPauseStartTime;
                  animPauseStartTime = null;
                }
                setAnimPlayState('running');
              }

              function seekToFrame(targetFi) {
                var totalMs = frameCount * timeout + restartDelay;
                var seekMs = targetFi * timeout;
                animStartWallTime = performance.now() - seekMs;
                animAccPauseMs = 0;
                animPauseStartTime = null;
                for (var fi = 0; fi < frameCount; fi++) {
                  var el = radarImage[fi].getContainer && radarImage[fi].getContainer();
                  if (el) {
                    el.style.animation = 'none';
                    el.offsetHeight;
                    el.style.animation = 'radar-frame-' + fi + ' ' + totalMs + 'ms ' + (fadeMs === 0 ? 'step-end' : 'linear') + ' -' + seekMs + 'ms infinite';
                  }
                }
              }

              function startUIUpdater(gen) {
                function scheduleNext() {
                  if (gen !== frameGeneration) return;
                  var totalMs = frameCount * timeout + restartDelay;
                  var elapsed = getAnimElapsed() % totalMs;
                  var fi = Math.min(Math.floor(elapsed / timeout), frameCount - 1);
                  if (fi >= 0) {
                    document.getElementById('timestamp').innerHTML = radarTime[fi];
                    document.getElementById('progress-bar').style.width = (fi + 1) * barSize + 'px';
                  }
                  // Schedule next update at the start of the next frame slot
                  var msIntoSlot = elapsed % timeout;
                  var msUntilNext = timeout - msIntoSlot + 10; // +10ms to land just after the boundary
                  setTimeout(scheduleNext, msUntilNext);
                }
                scheduleNext();
              }

              function createRadarLayer(frameData) {
                if (dataSource === 'NOAA') {
                  var isoTime = new Date(frameData.time * 1000).toISOString().split('.')[0] + 'Z';
                  return L.tileLayer.wms(noaaWmsURL, {
                    layers: noaaWmsLayer,
                    format: 'image/png',
                    transparent: true,
                    version: '1.3.0',
                    TIME: isoTime,
                    opacity: 0,
                    maxNativeZoom: 7,
                  });
                }
                return L.tileLayer(tileURL, {
                  path: frameData.path,
                  detectRetina: false,
                  tileSize: tileSize,
                  zoomOffset: 0,
                  opacity: 0,
                  maxNativeZoom: 7,
                });
              }

              async function initRadar() {
                var pastFrames = await fetchRadarPaths();
                radarPaths = pastFrames.slice(-frameCount);
                frameCount = radarPaths.length;

                var myGen = frameGeneration;
                var loadedCount = 0;

                for (i = 0; i < frameCount; i++) {
                  radarImage[i] = createRadarLayer(radarPaths[i]);
                  radarTime[i] = getRadarTimeString(radarPaths[i].time * 1000);
                  radarImage[i].addTo(radarMap);
                  setLayerZIndex(radarImage[i], i + 1);
                  var el = radarImage[i].getContainer && radarImage[i].getContainer();
                  if (el) el.style.opacity = '0';
                }

                barSize = document.getElementById("div-progress-bar").offsetWidth / frameCount;
                document.getElementById("progress-bar").style.width = barSize + "px";

                function onFrameLoad() {
                  if (myGen !== frameGeneration) return;
                  loadedCount++;
                  if (loadedCount === frameCount) {
                    radarReady = true;
                    applyAnimations();
                    startUIUpdater(myGen);
                    setUpdateTimeout();
                  }
                }

                for (i = 0; i < frameCount; i++) {
                  radarImage[i].once('load', onFrameLoad);
                }
              }

              var radarReady = false;
              initRadar();

              if (!osmLabels) {
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
              }

              ${
                this._config.show_marker === true
                  ? (() => {
                      const isMobile = this._isMobileDevice();
                      const userInfo = this._getCurrentUserInfo();
                      const iconCode = this._generateMarkerIconCode(isMobile, userInfo);
                      return `${iconCode}
                     L.marker([markerLat, markerLon], { icon: myIcon, interactive: false }).addTo(radarMap);`;
                    })()
                  : ''
              }

              ${this._config.show_range === true
        ? (this.hass?.config?.unit_system?.length ?? 'km') === 'km' ?
          'L.circle([markerLat, markerLon], { radius: 50000, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap); \
          L.circle([markerLat, markerLon], { radius: 100000, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap); \
          L.circle([markerLat, markerLon], { radius: 200000, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap);':
          'L.circle([markerLat, markerLon], { radius: 48280, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap); \
          L.circle([markerLat, markerLon], { radius: 96561, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap); \
          L.circle([markerLat, markerLon], { radius: 193121, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap);'
        : ''
      }

        // Use a Web Worker for timing to avoid Chromium iframe timer throttling
        var workerBlob = new Blob([
          'var timers = {};' +
          'var nextId = 1;' +
          'self.onmessage = function(e) {' +
          '  if (e.data.cmd === "set") {' +
          '    var id = nextId++;' +
          '    timers[id] = setTimeout(function() { self.postMessage({id: id, tag: e.data.tag}); delete timers[id]; }, e.data.ms);' +
          '    self.postMessage({id: id, tag: "ack"});' +
          '  } else if (e.data.cmd === "clear") {' +
          '    clearTimeout(timers[e.data.id]);' +
          '    delete timers[e.data.id];' +
          '  }' +
          '};'
        ], { type: 'application/javascript' });
        var timerWorker = new Worker(URL.createObjectURL(workerBlob));
        var workerCallbacks = {};
        timerWorker.onmessage = function(e) {
          if (e.data.tag && e.data.tag !== "ack" && workerCallbacks[e.data.tag]) {
            workerCallbacks[e.data.tag]();
          }
        };
        function workerTimeout(callback, ms, tag) {
          workerCallbacks[tag] = callback;
          timerWorker.postMessage({ cmd: "set", ms: ms, tag: tag });
        }


        function setUpdateTimeout() {
          workerTimeout(function() {
            if (radarReady && !navPaused && !viewPaused) {
              updateRadar();
            } else {
              doRadarUpdate = true;
            }
          }, framePeriod + frameLag, "update");
        }

        // Pause animation when card is scrolled out of view or tab is hidden
        var viewPaused = false;

        function onBecameVisible() {
          if (!viewPaused) return;
          viewPaused = false;
          if (doRadarUpdate && radarReady) {
            doRadarUpdate = false;
            updateRadar();
          } else {
            resumeAnimations();
          }
        }

        function onBecameHidden() {
          viewPaused = true;
          pauseAnimations();
        }

        // Intersection observer on the iframe element in the parent document
        if (window.frameElement) {
          var visObserver = new IntersectionObserver(function(entries) {
            if (entries[0].isIntersecting) {
              onBecameVisible();
            } else {
              onBecameHidden();
            }
          }, { threshold: 0.1 });
          visObserver.observe(window.frameElement);
        }

        // Also handle tab visibility changes
        document.addEventListener('visibilitychange', function() {
          if (document.hidden) {
            onBecameHidden();
          } else {
            onBecameVisible();
          }
        });

        async function updateRadar() {
          var pastFrames = await fetchRadarPaths();
          var latestFrame = pastFrames[pastFrames.length - 1];

          newLayer = createRadarLayer(latestFrame);
          newLayer.addTo(radarMap);
          newTime = getRadarTimeString(latestFrame.time * 1000);

          radarImage[0].remove();
          for (i = 0; i < frameCount - 1; i++) {
            radarImage[i] = radarImage[i + 1];
            radarTime[i] = radarTime[i + 1];
          }
          radarImage[frameCount - 1] = newLayer;
          radarTime[frameCount - 1] = newTime;

          // Re-apply animations with updated frame data
          newLayer.once('load', function() {
            for (i = 0; i < frameCount; i++) setLayerZIndex(radarImage[i], i + 1);
            applyAnimations();
          });

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

        function skipNext() {
          if (!radarReady) return;
          var totalMs = frameCount * timeout + restartDelay;
          var elapsed = getAnimElapsed() % totalMs;
          var fi = Math.min(Math.floor(elapsed / timeout), frameCount - 1);
          seekToFrame((fi + 1) % frameCount);
        }

        function skipBack() {
          if (!radarReady) return;
          var totalMs = frameCount * timeout + restartDelay;
          var elapsed = getAnimElapsed() % totalMs;
          var fi = Math.min(Math.floor(elapsed / timeout), frameCount - 1);
          seekToFrame((fi - 1 + frameCount) % frameCount);
        }

        function resizeWindow() {
          this.document.getElementById("color-bar").width = this.frameElement.offsetWidth;
          this.document.getElementById("img-color-bar").width = this.frameElement.offsetWidth;
          this.document.getElementById("mapid").width = this.frameElement.offsetWidth;
          var calculatedHeight = "${this._calculateHeight()}";
          if (calculatedHeight.endsWith("px")) {
            this.document.getElementById("mapid").height = parseInt(calculatedHeight);
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

    const calculatedHeight = this._calculateHeight();
    let padding = '540px';

    if (calculatedHeight.endsWith('px')) {
      const heightValue = parseInt(calculatedHeight);
      padding = `${heightValue + 48}px`;
    } else if (this.isPanel && this.offsetParent) {
      padding = `${this.offsetParent.clientHeight - 2 - (this.editMode === true ? 59 : 0)}px`;
    } else if (this._config && this._config.square_map) {
      padding = `${this.getBoundingClientRect().width + 48}px`;
    }

    const cardTitle = this._config.card_title !== undefined ? html`<div id="card-title">${this._config.card_title}</div>` : ``;
    const calculatedWidth = this._calculateWidth();

    return html`
      <style>
        ${this.styles}
        ha-card {
          width: ${calculatedWidth};
        }
      </style>
      <ha-card class="type-iframe">
        ${cardTitle}
        <div id="root" style="padding-top: ${padding}">
          <iframe srcdoc=${doc} scrolling="no"></iframe>
        </div>
      </ha-card>
    `;
  }

  private _buildRadarKeyframesCSS(): string {
    const frameCount = this._config.frame_count ?? 5;
    const timeout = this._config.frame_delay ?? 500;
    const restartDelay = this._config.restart_delay ?? 1000;
    const radarOpacity = 1.0;
    const animated = this._config.animated_transitions !== false;
    const fadeMs = animated
      ? (this._config.transition_time !== undefined ? this._config.transition_time : Math.floor(timeout * 0.4))
      : 0;
    const halfFade = Math.floor(fadeMs / 2);
    const totalMs = frameCount * timeout + restartDelay;

    const pct = (ms: number) => ((ms / totalMs) * 100).toFixed(4) + '%';

    // Each frame fi:
    //   - fades IN  from (fi*timeout - halfFade) to (fi*timeout)       — new frame reaches 1
    //   - holds     from (fi*timeout)             to ((fi+1)*timeout)  — both at 1 at transition point
    //   - fades OUT from ((fi+1)*timeout)          to ((fi+1)*timeout + halfFade) — old drops to 0
    let css = '';
    for (let fi = 0; fi < frameCount; fi++) {
      const slotStart = fi * timeout;
      const slotEnd = (fi + 1) * timeout;

      css += `@keyframes radar-frame-${fi} {`;

      if (halfFade === 0) {
        if (fi === 0) {
          css += `0% { opacity: ${radarOpacity}; } `;
        } else {
          css += `0% { opacity: 0; } `;
          css += `${pct(slotStart)} { opacity: ${radarOpacity}; } `;
        }
        if (fi === frameCount - 1) {
          css += `99.9999% { opacity: ${radarOpacity}; } `;
          css += `100% { opacity: 0; } `;
        } else {
          css += `${pct(slotEnd)} { opacity: 0; } `;
          css += `100% { opacity: 0; } `;
        }
      } else {
        const fadeInEnd    = slotStart;
        const fadeInStart  = fadeInEnd - halfFade;
        const fadeOutStart = slotEnd;
        const fadeOutEnd   = fadeOutStart + halfFade;

        if (fi === 0) {
          css += `0% { opacity: ${radarOpacity}; } `;
        } else {
          if (fadeInStart > 0) css += `${pct(fadeInStart)} { opacity: 0; } `;
          else css += `0% { opacity: 0; } `;
          css += `${pct(fadeInEnd)} { opacity: ${radarOpacity}; } `;
        }

        if (fi === frameCount - 1) {
          // Hold last frame through restart delay, drop instantly at loop
          css += `${pct(fadeOutStart)} { opacity: ${radarOpacity}; } `;
          css += `99.9999% { opacity: ${radarOpacity}; } `;
          css += `100% { opacity: 0; } `;
        } else {
          css += `${pct(fadeOutStart)} { opacity: ${radarOpacity}; } `;
          css += `${pct(Math.min(fadeOutEnd, totalMs))} { opacity: 0; } `;
          css += `100% { opacity: 0; } `;
        }
      }

      css += `} `;
    }
    return css;
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

  private _validateCssSize(value: string | undefined): boolean {
    if (!value) return true;
    const cssUnitRegex = /^\d+(\.\d+)?(px|%|em|rem|vh|vw)$/;
    return cssUnitRegex.test(value.trim());
  }

  private _calculateHeight(): string {
    if (!this._config) {
      return '492px';
    }

    if (this._config.height && this._validateCssSize(this._config.height)) {
      return this._config.height;
    }

    if (this.isPanel) {
      return this.offsetParent
        ? `${this.offsetParent.clientHeight - 48 - 2 - (this.editMode === true ? 59 : 0)}px`
        : '540px';
    }

    if (this._config.square_map !== undefined && this._config.square_map) {
      return `${this.getBoundingClientRect().width}px`;
    }

    return '492px';
  }

  private _calculateWidth(): string {
    if (!this._config) {
      return '100%';
    }

    if (this._config.width && this._validateCssSize(this._config.width)) {
      return this._config.width;
    }
    return '100%';
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
      #card-title {
        margin: 8px 0px 4px 8px;
        font-size: 1.5em;
      }
    `;
  }
}

// Manual registration as fallback in case decorator doesn't work
if (!customElements.get('weather-radar-card')) {
  customElements.define('weather-radar-card', WeatherRadarCard);
}
