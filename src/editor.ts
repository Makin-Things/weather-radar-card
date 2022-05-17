/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, CSSResultGroup } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { WeatherRadarCardConfig } from './types';
import { customElement, property, state } from 'lit/decorators';
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
        <mwc-select label="Data Source (optional)" .configValue=${'data_source'} .value=${config.data_source ?
              config.data_source : ''} @selected=${this._valueChangedString} @closed=${(ev)=>
              ev.stopPropagation()}
            >
            <mwc-list-item></mwc-list-item>
            <mwc-list-item value="RainViewer-Original">RainViewer - Original</mwc-list-item>
            <mwc-list-item value="RainViewer-UniversalBlue">RainViewer - Universal Blue</mwc-list-item>
            <mwc-list-item value="RainViewer-TITAN">RainViewer - TITAN</mwc-list-item>
            <mwc-list-item value="RainViewer-TWC">RainViewer - The Weather Channel</mwc-list-item>
            <mwc-list-item value="RainViewer-Meteored">RainViewer - Meteored</mwc-list-item>
            <mwc-list-item value="RainViewer-NEXRAD">RainViewer - NEXRAD Level III</mwc-list-item>
            <mwc-list-item value="RainViewer-Rainbow">RainViewer - Rainbow @ SELEX-IS</mwc-list-item>
            <mwc-list-item value="RainViewer-DarkSky">RainViewer - Dark Sky</mwc-list-item>
        </mwc-select>
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
            <mwc-list-item value="8">8</mwc-list-item>
            <mwc-list-item value="9">9</mwc-list-item>
            <mwc-list-item value="10">10</mwc-list-item>
          </mwc-select>
        </div>
        <mwc-textfield
            label="Map Centre Latitude (optional)"
            .value=${config.center_latitude ? config.center_latitude : ''}
            .configValue=${'center_latitude'}
            @input=${this._valueChangedNumber}
        ></mwc-textfield>
        <mwc-textfield
            label="Map Centre Longitude (optional)"
            .value=${config.center_longitude ? config.center_longitude : ''}
            .configValue=${'center_longitude'}
            @input=${this._valueChangedNumber}
        ></mwc-textfield>
        <mwc-textfield
            label="Marker Latitude (optional)"
            .value=${config.marker_latitude ? config.marker_latitude : ''}
            .configValue=${'marker_latitude'}
            @input=${this._valueChangedNumber}
        ></mwc-textfield>
        <mwc-textfield
            label="Marker Longitude (optional)"
            .value=${config.marker_longitude ? config.marker_longitude : ''}
            .configValue=${'marker_longitude'}
            @input=${this._valueChangedNumber}
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
