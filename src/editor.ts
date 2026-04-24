/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, CSSResultGroup } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import { WeatherRadarCardConfig, CoordinateConfig } from './types';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('weather-radar-card-editor')
export class WeatherRadarCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: WeatherRadarCardConfig;

  @state() private _helpers?: any;

  private _initialized = false;

  public setConfig(config: WeatherRadarCardConfig): void {
    this._config = config;

    this.loadCardHelpers();
  }

  protected shouldUpdate(): boolean {
    if (!this._initialized) {
      this._initialize();
    }

    return true;
  }

  get _name(): string {
    return this._config?.name || '';
  }

  get _entity(): string {
    return this._config?.entity || '';
  }

  get _show_warning(): boolean {
    return this._config?.show_warning || false;
  }

  get _show_error(): boolean {
    return this._config?.show_error || false;
  }

  get _height(): string {
    return this._config?.height || '';
  }

  get _width(): string {
    return this._config?.width || '';
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._helpers) {
      return html``;
    }

    let config;
    // eslint-disable-next-line prefer-const
    config = this._config;

    return html`
      <div class="values">

        <!-- MAP -->
        <h3 class="section-header">Map</h3>
        <ha-selector
          .hass=${this.hass}
          .selector=${{
            select: {
              options: [
                { value: 'RainViewer', label: 'RainViewer (Global)' },
                { value: 'NOAA', label: 'NOAA/NWS (US Only — Experimental)' },
              ],
            },
          }}
          .value=${config.data_source || 'RainViewer'}
          .label=${'Radar Source'}
          .configValue=${'data_source'}
          @value-changed=${this._handleSelectorChanged}
        ></ha-selector>
        <div class="side-by-side">
          <ha-selector
            .hass=${this.hass}
            .selector=${{
              select: {
                options: [
                  { value: 'Light', label: 'CARTO Light (English only)' },
                  { value: 'Voyager', label: 'CARTO Voyager (English only)' },
                  { value: 'Dark', label: 'CARTO Dark (English only)' },
                  { value: 'Satellite', label: 'Satellite (English only)' },
                  { value: 'OSM', label: 'OpenStreetMap (Localized)' },
                ],
              },
            }}
            .value=${config.map_style || 'Light'}
            .label=${'Map Style'}
            .configValue=${'map_style'}
            @value-changed=${this._handleSelectorChanged}
          ></ha-selector>
          <ha-selector
            .hass=${this.hass}
            .selector=${{
              select: {
                options: [
                  { value: '', label: 'Default (5)' },
                  { value: '4', label: '4' },
                  { value: '5', label: '5' },
                  { value: '6', label: '6' },
                  { value: '7', label: '7' },
                  { value: '8', label: '8' },
                  { value: '9', label: '9' },
                  { value: '10', label: '10' },
                ],
              },
            }}
            .value=${config.zoom_level?.toString() || ''}
            .label=${'Zoom Level'}
            .configValue=${'zoom_level'}
            @value-changed=${this._handleSelectorNumberChanged}
          ></ha-selector>
        </div>

        <!-- LOCATION -->
        <h3 class="section-header">Location</h3>
        <div class="side-by-side">
          <ha-textfield
            label="Centre Latitude"
            .value=${this._formatCoordinateValue(config.center_latitude)}
            .configValue=${'center_latitude'}
            @input=${this._valueChangedCoordinate}
            helper="Number or entity ID"
          ></ha-textfield>
          <ha-textfield
            label="Centre Longitude"
            .value=${this._formatCoordinateValue(config.center_longitude)}
            .configValue=${'center_longitude'}
            @input=${this._valueChangedCoordinate}
            helper="Number or entity ID"
          ></ha-textfield>
        </div>
        <div class="side-by-side">
          <ha-textfield
            label="Marker Latitude"
            .value=${this._formatCoordinateValue(config.marker_latitude)}
            .configValue=${'marker_latitude'}
            @input=${this._valueChangedCoordinate}
            helper="Number or entity ID"
          ></ha-textfield>
          <ha-textfield
            label="Marker Longitude"
            .value=${this._formatCoordinateValue(config.marker_longitude)}
            .configValue=${'marker_longitude'}
            @input=${this._valueChangedCoordinate}
            helper="Number or entity ID"
          ></ha-textfield>
        </div>

        <!-- DISPLAY -->
        <h3 class="section-header">Display</h3>
        <div class="side-by-side">
          <label>Show Zoom
            <ha-switch .checked=${config.show_zoom === true} .configValue=${'show_zoom'} @change=${this._valueChangedSwitch}></ha-switch>
          </label>
          <label>Show Playback
            <ha-switch .checked=${config.show_playback === true} .configValue=${'show_playback'} @change=${this._valueChangedSwitch}></ha-switch>
          </label>
          <label>Show Recenter
            <ha-switch .checked=${config.show_recenter === true} .configValue=${'show_recenter'} @change=${this._valueChangedSwitch}></ha-switch>
          </label>
        </div>
        <div class="side-by-side">
          <label>Show Scale
            <ha-switch .checked=${config.show_scale === true} .configValue=${'show_scale'} @change=${this._valueChangedSwitch}></ha-switch>
          </label>
          <label>Show Range
            <ha-switch .checked=${config.show_range === true} .configValue=${'show_range'} @change=${this._valueChangedSwitch}></ha-switch>
          </label>
          <label>Extra Labels
            <ha-switch .checked=${config.extra_labels === true} .configValue=${'extra_labels'} @change=${this._valueChangedSwitch}></ha-switch>
          </label>
        </div>
        <div class="side-by-side">
          <label>Static Map
            <ha-switch .checked=${config.static_map === true} .configValue=${'static_map'} @change=${this._valueChangedSwitch}></ha-switch>
          </label>
          <label>Square Map
            <ha-switch .checked=${config.square_map === true} .configValue=${'square_map'} @change=${this._valueChangedSwitch}></ha-switch>
          </label>
          <label>Show Marker
            <ha-switch .checked=${config.show_marker === true} .configValue=${'show_marker'} @change=${this._valueChangedSwitch}></ha-switch>
          </label>
        </div>
        ${config.show_marker === true ? html`
          <div class="subsection">
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                select: {
                  options: [
                    { value: 'default', label: 'Home (default)' },
                    { value: 'entity_picture', label: 'Entity Picture' },
                    { value: 'mdi:account', label: 'MDI: Account' },
                    { value: 'mdi:account-circle', label: 'MDI: Account Circle' },
                    { value: 'mdi:map-marker', label: 'MDI: Map Marker' },
                    { value: 'mdi:home', label: 'MDI: Home' },
                    { value: 'mdi:car', label: 'MDI: Car' },
                    { value: 'mdi:cellphone', label: 'MDI: Cellphone' },
                  ],
                },
              }}
              .value=${config.marker_icon || 'default'}
              .label=${'Marker Icon'}
              .configValue=${'marker_icon'}
              @value-changed=${this._handleSelectorChanged}
            ></ha-selector>
            ${config.marker_icon === 'entity_picture' ? html`
              <ha-textfield
                label="Icon Entity"
                .value=${config.marker_icon_entity || ''}
                .configValue=${'marker_icon_entity'}
                @input=${this._valueChangedString}
                helper="Auto-detected from marker entity if empty"
              ></ha-textfield>
            ` : ''}
          </div>
        ` : ''}

        <!-- ANIMATION -->
        <h3 class="section-header">Animation</h3>
        <div class="side-by-side">
          <ha-textfield
            label="Frame Count"
            .value=${config.frame_count ? config.frame_count : ''}
            .configValue=${'frame_count'}
            @input=${this._valueChangedNumber}
            helper="Default: 5"
          ></ha-textfield>
          <ha-textfield
            label="Frame Delay (ms)"
            .value=${config.frame_delay ? config.frame_delay : ''}
            .configValue=${'frame_delay'}
            @input=${this._valueChangedNumber}
            helper="Default: 500"
          ></ha-textfield>
          <ha-textfield
            label="Restart Delay (ms)"
            .value=${config.restart_delay ? config.restart_delay : ''}
            .configValue=${'restart_delay'}
            @input=${this._valueChangedNumber}
            helper="Default: 1000"
          ></ha-textfield>
        </div>
        <label>Show Snow
          <ha-switch
            .checked=${config.show_snow === true}
            .configValue=${'show_snow'}
            @change=${this._valueChangedSwitch}
          ></ha-switch>
        </label>
        <label>Animated Transitions
          <ha-switch
            .checked=${config.animated_transitions !== false}
            .configValue=${'animated_transitions'}
            @change=${this._valueChangedSwitch}
          ></ha-switch>
        </label>
        ${config.animated_transitions !== false ? html`
          <ha-textfield
            label="Transition Time (ms)"
            .value=${config.transition_time !== undefined ? config.transition_time : ''}
            .configValue=${'transition_time'}
            @input=${this._valueChangedNumber}
            helper="Default: 40% of frame delay — max: frame delay"
          ></ha-textfield>
        ` : ''}

        <!-- MOBILE OVERRIDES -->
        <h3 class="section-header">Mobile Overrides</h3>
        <p class="section-description">
          Override centre and marker coordinates when accessed from a mobile device.
          Leave blank to use the base coordinates on all devices.
        </p>
        <div class="side-by-side">
          <ha-textfield
            label="Mobile Centre Latitude"
            .value=${this._formatCoordinateValue(config.mobile_center_latitude)}
            .configValue=${'mobile_center_latitude'}
            @input=${this._valueChangedCoordinate}
            helper="e.g. device_tracker.phone"
          ></ha-textfield>
          <ha-textfield
            label="Mobile Centre Longitude"
            .value=${this._formatCoordinateValue(config.mobile_center_longitude)}
            .configValue=${'mobile_center_longitude'}
            @input=${this._valueChangedCoordinate}
          ></ha-textfield>
        </div>
        <div class="side-by-side">
          <ha-textfield
            label="Mobile Marker Latitude"
            .value=${this._formatCoordinateValue(config.mobile_marker_latitude)}
            .configValue=${'mobile_marker_latitude'}
            @input=${this._valueChangedCoordinate}
          ></ha-textfield>
          <ha-textfield
            label="Mobile Marker Longitude"
            .value=${this._formatCoordinateValue(config.mobile_marker_longitude)}
            .configValue=${'mobile_marker_longitude'}
            @input=${this._valueChangedCoordinate}
          ></ha-textfield>
        </div>
        ${config.show_marker === true ? html`
          <div class="subsection">
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                select: {
                  options: [
                    { value: '', label: 'Same as desktop' },
                    { value: 'default', label: 'Home' },
                    { value: 'entity_picture', label: 'Entity Picture' },
                    { value: 'mdi:account', label: 'MDI: Account' },
                    { value: 'mdi:account-circle', label: 'MDI: Account Circle' },
                    { value: 'mdi:map-marker', label: 'MDI: Map Marker' },
                    { value: 'mdi:home', label: 'MDI: Home' },
                    { value: 'mdi:car', label: 'MDI: Car' },
                    { value: 'mdi:cellphone', label: 'MDI: Cellphone' },
                  ],
                },
              }}
              .value=${config.mobile_marker_icon || ''}
              .label=${'Mobile Marker Icon'}
              .configValue=${'mobile_marker_icon'}
              @value-changed=${this._handleSelectorChanged}
            ></ha-selector>
            ${config.mobile_marker_icon === 'entity_picture' ? html`
              <ha-textfield
                label="Mobile Icon Entity"
                .value=${config.mobile_marker_icon_entity || ''}
                .configValue=${'mobile_marker_icon_entity'}
                @input=${this._valueChangedString}
                helper="Mobile override for entity picture"
              ></ha-textfield>
            ` : ''}
          </div>
        ` : ''}

        <!-- APPEARANCE -->
        <h3 class="section-header">Appearance</h3>
        <ha-textfield
          label="Card Title"
          .value=${config.card_title ? config.card_title : ''}
          .configValue=${'card_title'}
          @input=${this._valueChangedString}
        ></ha-textfield>
        <div class="side-by-side">
          <ha-textfield
            label="Height"
            .value=${config.height ? config.height : ''}
            .configValue=${'height'}
            @input=${this._valueChangedString}
            helper="e.g. 400px, 50vh"
          ></ha-textfield>
          <ha-textfield
            label="Width"
            .value=${config.width ? config.width : ''}
            .configValue=${'width'}
            @input=${this._valueChangedString}
            helper="e.g. 100%, 500px"
          ></ha-textfield>
        </div>

      </div>
    `;
  }

  private _initialize(): void {
    if (this.hass === undefined) return;
    if (this._config === undefined) return;
    if (this._helpers === undefined) return;
    this._initialized = true;
  }

  private async loadCardHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }

  private _handleSelectorChanged(ev: CustomEvent): void {
    const configValue = (ev.target as any).configValue;
    const value = ev.detail.value;

    if (!this._config || !configValue) return;
    if (this._config[configValue] === value) return;

    if (value === '' || value === null) {
      const newConfig = { ...this._config };
      delete newConfig[configValue];
      this._config = newConfig;
    } else {
      this._config = {
        ...this._config,
        [configValue]: value,
      };
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _handleSelectorNumberChanged(ev: CustomEvent): void {
    const configValue = (ev.target as any).configValue;
    const value = ev.detail.value;

    if (!this._config || !configValue) return;

    const numValue = value === '' || value === null ? null : Number(value);
    if (this._config[configValue] === numValue) return;

    if (numValue === null) {
      const newConfig = { ...this._config };
      delete newConfig[configValue];
      this._config = newConfig;
    } else {
      this._config = {
        ...this._config,
        [configValue]: numValue,
      };
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _valueChangedSwitch(ev): void {
    const target = ev.target;

    if (!this._config || !this.hass || !target) {
      return;
    }
    this._config = {
      ...this._config,
      [target.configValue]: target.checked,
    };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _valueChangedNumber(ev): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    const configValue = target.configValue;
    const value = target.value;
    if (this._config[configValue] === Number(value)) {
      return;
    }

    if (configValue) {
      if (value === '' || value === null) {
        delete this._config[configValue];
      } else {
        this._config = {
          ...this._config,
          [configValue]: Number(value),
        };
      }
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _valueChangedString(ev): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    const configValue = target.configValue;
    const value = target.value;
    if (this._config[configValue] === value) {
      return;
    }

    if (configValue) {
      if (value === '') {
        delete this._config[configValue];
      } else {
        this._config = {
          ...this._config,
          [configValue]: value,
        };
      }
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  /**
   * Formats coordinate config for display in text field
   * Handles numbers, strings, and entity objects
   */
  private _formatCoordinateValue(value: CoordinateConfig | undefined): string {
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && 'entity' in value) {
      // For object format, just show the entity ID
      return value.entity;
    }
    return '';
  }

  /**
   * Handles coordinate field changes (accepts both numbers and entity IDs)
   */
  private _valueChangedCoordinate(ev): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    if (target.configValue) {
      const value = target.value?.trim();

      if (value === '' || value === null) {
        // Remove config value
        delete this._config[target.configValue];
      } else {
        // Check if it's a number or entity ID
        const numValue = parseFloat(value);

        if (!isNaN(numValue)) {
          // Store as number (backwards compatible)
          this._config = {
            ...this._config,
            [target.configValue]: numValue,
          };
        } else if (value.includes('.')) {
          // Looks like an entity ID (has a dot)
          this._config = {
            ...this._config,
            [target.configValue]: value,
          };
        } else {
          // Invalid - show console warning but keep value
          console.warn(
            `Weather Radar Card Editor: '${value}' should be a number or entity ID (e.g., device_tracker.phone)`,
          );
          this._config = {
            ...this._config,
            [target.configValue]: value,
          };
        }
      }
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  static styles: CSSResultGroup = css`
    ha-select,
    ha-selector,
    ha-textfield {
      margin-bottom: 16px;
      display: block;
    }
    .section-header {
      font-size: 0.75em;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--primary-color);
      margin: 20px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--divider-color);
    }
    .section-header:first-child {
      margin-top: 4px;
    }
    .section-description {
      font-size: 0.85em;
      color: var(--secondary-text-color);
      margin: 0 0 12px 0;
    }
    .subsection {
      margin-left: 16px;
      padding-left: 8px;
      border-left: 2px solid var(--divider-color);
      margin-bottom: 8px;
    }
    label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 0.95em;
    }
    ha-switch {
      padding: 12px 6px;
    }
    .side-by-side {
      display: flex;
      gap: 8px;
    }
    .side-by-side > * {
      flex: 1;
      min-width: 0;
    }
    .values {
      padding: 0 16px 8px 16px;
      background: var(--secondary-background-color);
    }
  `;
}
