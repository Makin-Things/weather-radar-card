/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, CSSResultGroup } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { WeatherRadarCardConfig, CoordinateConfig } from './types';
import { customElement, property, state } from 'lit/decorators.js';
import { formfieldDefinition } from '../elements/formfield';
import { selectDefinition } from '../elements/select';
import { switchDefinition } from '../elements/switch';
import { textfieldDefinition } from '../elements/textfield';
import { sliderDefinition } from '../elements/slider';

@customElement('weather-radar-card-editor')
export class WeatherRadarCardEditor extends ScopedRegistryHost(LitElement) implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: WeatherRadarCardConfig;

  @state() private _helpers?: any;

  private _initialized = false;

  static elementDefinitions = {
    ...textfieldDefinition,
    ...selectDefinition,
    ...switchDefinition,
    ...formfieldDefinition,
    ...sliderDefinition,
  };

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
        <mwc-textfield
            label="Card Title (optional)"
            .value=${config.card_title ? config.card_title : ''}
            .configValue=${'card_title'}
            @input=${this._valueChangedString}
        ></mwc-textfield>
        <mwc-textfield
            label="Height (optional)"
            .value=${config.height ? config.height : ''}
            .configValue=${'height'}
            @input=${this._valueChangedString}
            helper="e.g., 400px, 50vh"
        ></mwc-textfield>
        <mwc-textfield
            label="Width (optional)"
            .value=${config.width ? config.width : ''}
            .configValue=${'width'}
            @input=${this._valueChangedString}
            helper="e.g., 100%, 500px"
        ></mwc-textfield>
        
        <div class="side-by-side">
          <mwc-select label="Map Style (optional)" .configValue=${'map_style'} .value=${config.map_style ?
              config.map_style : ''} @selected=${this._valueChangedString} @closed=${(ev)=>
              ev.stopPropagation()}
            >
            <mwc-list-item></mwc-list-item>
            <mwc-list-item value="Light">Light</mwc-list-item>
            <mwc-list-item value="Voyager">Voyager</mwc-list-item>
            <mwc-list-item value="Satellite">Satellite</mwc-list-item>
            <mwc-list-item value="Dark">Dark</mwc-list-item>
          </mwc-select>
          <mwc-select label="Zoom Level (optional)" .configValue=${'zoom_level'} .value=${config.zoom_level ?
              config.zoom_level.toString() : null} @selected=${this._valueChangedNumber} @closed=${(ev)=>
              ev.stopPropagation()}
            >
            <mwc-list-item></mwc-list-item>
            <mwc-list-item value="4">4</mwc-list-item>
            <mwc-list-item value="5">5</mwc-list-item>
            <mwc-list-item value="6">6</mwc-list-item>
            <mwc-list-item value="7">7</mwc-list-item>
          </mwc-select>
        </div>
        <mwc-textfield
            label="Map Centre Latitude (optional)"
            .value=${this._formatCoordinateValue(config.center_latitude)}
            .configValue=${'center_latitude'}
            @input=${this._valueChangedCoordinate}
            helper="Number or entity ID (e.g., device_tracker.phone)"
        ></mwc-textfield>
        <mwc-textfield
            label="Map Centre Longitude (optional)"
            .value=${this._formatCoordinateValue(config.center_longitude)}
            .configValue=${'center_longitude'}
            @input=${this._valueChangedCoordinate}
            helper="Number or entity ID"
        ></mwc-textfield>
        <mwc-textfield
            label="Marker Latitude (optional)"
            .value=${this._formatCoordinateValue(config.marker_latitude)}
            .configValue=${'marker_latitude'}
            @input=${this._valueChangedCoordinate}
            helper="Number or entity ID"
        ></mwc-textfield>
        <mwc-textfield
            label="Marker Longitude (optional)"
            .value=${this._formatCoordinateValue(config.marker_longitude)}
            .configValue=${'marker_longitude'}
            @input=${this._valueChangedCoordinate}
            helper="Number or entity ID"
        ></mwc-textfield>
        <h3>Mobile Device Overrides</h3>
        <p style="font-size: 0.9em; color: var(--secondary-text-color); margin: 0 0 10px 0;">
          When accessed from a mobile device, these coordinates will override the base coordinates above.
        </p>
        <mwc-textfield
            label="Mobile Centre Latitude (optional)"
            .value=${this._formatCoordinateValue(config.mobile_center_latitude)}
            .configValue=${'mobile_center_latitude'}
            @input=${this._valueChangedCoordinate}
            helper="Mobile override (e.g., device_tracker.phone)"
        ></mwc-textfield>
        <mwc-textfield
            label="Mobile Centre Longitude (optional)"
            .value=${this._formatCoordinateValue(config.mobile_center_longitude)}
            .configValue=${'mobile_center_longitude'}
            @input=${this._valueChangedCoordinate}
            helper="Mobile override"
        ></mwc-textfield>
        <mwc-textfield
            label="Mobile Marker Latitude (optional)"
            .value=${this._formatCoordinateValue(config.mobile_marker_latitude)}
            .configValue=${'mobile_marker_latitude'}
            @input=${this._valueChangedCoordinate}
            helper="Mobile override"
        ></mwc-textfield>
        <mwc-textfield
            label="Mobile Marker Longitude (optional)"
            .value=${this._formatCoordinateValue(config.mobile_marker_longitude)}
            .configValue=${'mobile_marker_longitude'}
            @input=${this._valueChangedCoordinate}
            helper="Mobile override"
        ></mwc-textfield>
        <div class="side-by-side">
          <mwc-textfield
              label="Frame Count (optional)"
              .value=${config.frame_count ? config.frame_count : ''}
              .configValue=${'frame_count'}
              @input=${this._valueChangedNumber}
          ></mwc-textfield>
          <mwc-textfield
              label="Frame Delay(ms) (optional)"
              .value=${config.frame_delay ? config.frame_delay : ''}
              .configValue=${'frame_delay'}
              @input=${this._valueChangedNumber}
          ></mwc-textfield>
          <mwc-textfield
              label="Restart Delay(ms) (optional)"
              .value=${config.restart_delay ? config.restart_delay : ''}
              .configValue=${'restart_delay'}
              @input=${this._valueChangedNumber}
          ></mwc-textfield>
        </div>
        <div class="side-by-side">
          <mwc-formfield .label=${"Static Map"}>
            <mwc-switch
              .checked=${config.static_map === true}
              .configValue=${'static_map'}
              @change=${this._valueChangedSwitch}
            ></mwc-switch>
          </mwc-formfield>
          <mwc-formfield .label=${'Show Zoom'}>
            <mwc-switch
              .checked=${config.show_zoom === true}
              .configValue=${'show_zoom'}
              @change=${this._valueChangedSwitch}
            ></mwc-switch>
          </mwc-formfield>
          <mwc-formfield .label=${'Square Map'}>
            <mwc-switch
              .checked=${config.square_map === true}
              .configValue=${'square_map'}
              @change=${this._valueChangedSwitch}
            ></mwc-switch>
          </mwc-formfield>
        </div>
        <div class="side-by-side">
          <mwc-formfield .label=${"Show Marker"}>
            <mwc-switch
              .checked=${config.show_marker === true}
              .configValue=${'show_marker'}
              @change=${this._valueChangedSwitch}
            ></mwc-switch>
          </mwc-formfield>
          <mwc-formfield .label=${'Show Playback'}>
            <mwc-switch
              .checked=${config.show_playback === true}
              .configValue=${'show_playback'}
              @change=${this._valueChangedSwitch}
            ></mwc-switch>
          </mwc-formfield>
          <mwc-formfield .label=${'Show Recenter'}>
            <mwc-switch
              .checked=${config.show_recenter === true}
              .configValue=${'show_recenter'}
              @change=${this._valueChangedSwitch}
            ></mwc-switch>
          </mwc-formfield>
        </div>
        ${
          config.show_marker === true
            ? html`
                <h3>Marker Icon</h3>
                <div class="side-by-side">
                  <mwc-select
                    label="Icon Type"
                    .configValue=${'marker_icon'}
                    .value=${config.marker_icon || 'default'}
                    @selected=${this._valueChangedString}
                    @closed=${(ev) => ev.stopPropagation()}
                  >
                    <mwc-list-item value="default">Default (Home)</mwc-list-item>
                    <mwc-list-item value="entity_picture">Entity Picture</mwc-list-item>
                    <mwc-list-item value="mdi:account">MDI: Account</mwc-list-item>
                    <mwc-list-item value="mdi:account-circle">MDI: Account Circle</mwc-list-item>
                    <mwc-list-item value="mdi:map-marker">MDI: Map Marker</mwc-list-item>
                    <mwc-list-item value="mdi:home">MDI: Home</mwc-list-item>
                    <mwc-list-item value="mdi:car">MDI: Car</mwc-list-item>
                    <mwc-list-item value="mdi:cellphone">MDI: Cellphone</mwc-list-item>
                  </mwc-select>
                </div>
                ${config.marker_icon === 'entity_picture'
                  ? html`
                      <mwc-textfield
                        label="Icon Entity (optional)"
                        .value=${config.marker_icon_entity || ''}
                        .configValue=${'marker_icon_entity'}
                        @input=${this._valueChangedString}
                        helper="Entity with picture (auto-detects from marker entity if empty)"
                      ></mwc-textfield>
                    `
                  : ''}
                <h4>Mobile Icon Overrides</h4>
                <div class="side-by-side">
                  <mwc-select
                    label="Mobile Icon Type (optional)"
                    .configValue=${'mobile_marker_icon'}
                    .value=${config.mobile_marker_icon || ''}
                    @selected=${this._valueChangedString}
                    @closed=${(ev) => ev.stopPropagation()}
                  >
                    <mwc-list-item></mwc-list-item>
                    <mwc-list-item value="default">Default (Home)</mwc-list-item>
                    <mwc-list-item value="entity_picture">Entity Picture</mwc-list-item>
                    <mwc-list-item value="mdi:account">MDI: Account</mwc-list-item>
                    <mwc-list-item value="mdi:account-circle">MDI: Account Circle</mwc-list-item>
                    <mwc-list-item value="mdi:map-marker">MDI: Map Marker</mwc-list-item>
                    <mwc-list-item value="mdi:home">MDI: Home</mwc-list-item>
                    <mwc-list-item value="mdi:car">MDI: Car</mwc-list-item>
                    <mwc-list-item value="mdi:cellphone">MDI: Cellphone</mwc-list-item>
                  </mwc-select>
                </div>
                ${config.mobile_marker_icon === 'entity_picture'
                  ? html`
                      <mwc-textfield
                        label="Mobile Icon Entity (optional)"
                        .value=${config.mobile_marker_icon_entity || ''}
                        .configValue=${'mobile_marker_icon_entity'}
                        @input=${this._valueChangedString}
                        helper="Mobile override for entity with picture"
                      ></mwc-textfield>
                    `
                  : ''}
              `
            : ''
        }
        <div class="side-by-side">
          <mwc-formfield .label=${"Show Scale"}>
            <mwc-switch
              .checked=${config.show_scale === true}
              .configValue=${'show_scale'}
              @change=${this._valueChangedSwitch}
            ></mwc-switch>
          </mwc-formfield>
          <mwc-formfield .label=${'Show Range'}>
            <mwc-switch
              .checked=${config.show_range === true}
              .configValue=${'show_range'}
              @change=${this._valueChangedSwitch}
            ></mwc-switch>
          </mwc-formfield>
          <mwc-formfield .label=${'Show Extra Labels'}>
            <mwc-switch
              .checked=${config.extra_labels === true}
              .configValue=${'extra_labels'}
              @change=${this._valueChangedSwitch}
            ></mwc-switch>
          </mwc-formfield>
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
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === '' || target.value === null) {
        delete this._config[target.configValue];
      } else {
        this._config = {
          ...this._config,
          [target.configValue]: Number(target.value),
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
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === '') {
        delete this._config[target.configValue];
      } else {
        this._config = {
          ...this._config,
          [target.configValue]: target.value,
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
    mwc-select,
    mwc-textfield {
      margin-bottom: 16px;
      display: block;
    }
    mwc-formfield {
      padding-bottom: 8px;
    }
    mwc-switch {
      --mdc-theme-secondary: var(--switch-checked-color);
    }
    .option {
      padding: 4px 0px;
      cursor: pointer;
    }
    .row {
      display: flex;
      margin-bottom: -14px;
      pointer-events: none;
    }
    .title {
      padding-left: 16px;
      margin-top: -6px;
      pointer-events: none;
    }
    .secondary {
      padding-left: 40px;
      color: var(--secondary-text-color);
      pointer-events: none;
    }
    .values {
      padding-left: 16px;
      background: var(--secondary-background-color);
    }
    ha-switch {
      padding: 16px 6px;
    }
    .side-by-side {
      display: flex;
    }
    .side-by-side > * {
      flex: 1;
      padding-right: 4px;
    }
  `;
}
