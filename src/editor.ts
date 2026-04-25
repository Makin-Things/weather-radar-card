/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, CSSResultGroup } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import { WeatherRadarCardConfig, CoordinateConfig, Marker } from './types';
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

  private _boundCenterUpdate = (e: Event): void => {
    const ev = e as CustomEvent;
    if (!this._config) return;
    this._config = {
      ...this._config,
      center_latitude: ev.detail.center_latitude,
      center_longitude: ev.detail.center_longitude,
      zoom_level: ev.detail.zoom_level,
    };
    fireEvent(this, 'config-changed', { config: this._config });
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('weather-radar-center-update', this._boundCenterUpdate);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('weather-radar-center-update', this._boundCenterUpdate);
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
                  { value: 'Auto', label: 'Auto (follows OS dark/light mode)' },
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

        <!-- MARKERS -->
        <h3 class="section-header">Markers</h3>
        ${(config.markers ?? []).map((m, i) => this._renderMarkerRow(m, i))}
        <button class="add-marker-btn" @click=${this._addMarker}>+ Add Marker</button>

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
        </div>
        <div class="side-by-side">
          <label>Show Snow
            <ha-switch .checked=${config.show_snow === true} .configValue=${'show_snow'} @change=${this._valueChangedSwitch}></ha-switch>
          </label>
          <label>Show Colour Bar
            <ha-switch .checked=${config.show_color_bar !== false} .configValue=${'show_color_bar'} @change=${this._valueChangedSwitch}></ha-switch>
          </label>
          <label>Show Progress Bar
            <ha-switch .checked=${config.show_progress_bar !== false} .configValue=${'show_progress_bar'} @change=${this._valueChangedSwitch}></ha-switch>
          </label>
        </div>

        <!-- INTERACTION -->
        <h3 class="section-header">Interaction</h3>
        <label>Disable Scroll (allow page swipe through map)
          <ha-switch .checked=${config.disable_scroll === true} .configValue=${'disable_scroll'} @change=${this._valueChangedSwitch}></ha-switch>
        </label>
        <ha-selector
          .hass=${this.hass}
          .selector=${{
            select: {
              options: [
                { value: 'none', label: 'None' },
                { value: 'recenter', label: 'Re-centre map' },
                { value: 'toggle_play', label: 'Toggle play / pause' },
              ],
            },
          }}
          .value=${config.double_tap_action || 'none'}
          .label=${'Double-tap action'}
          .configValue=${'double_tap_action'}
          @value-changed=${this._handleSelectorChanged}
        ></ha-selector>

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

  private _renderMarkerRow(m: Marker, i: number) {
    const iconOptions = [
      { value: 'default', label: 'Home (default)' },
      { value: 'entity_picture', label: 'Entity Picture' },
      { value: 'mdi:account', label: 'MDI: Account' },
      { value: 'mdi:account-circle', label: 'MDI: Account Circle' },
      { value: 'mdi:map-marker', label: 'MDI: Map Marker' },
      { value: 'mdi:home', label: 'MDI: Home' },
      { value: 'mdi:car', label: 'MDI: Car' },
      { value: 'mdi:bicycle', label: 'MDI: Bicycle' },
      { value: 'mdi:cellphone', label: 'MDI: Cellphone' },
    ];
    const trackOptions = [
      { value: '', label: 'Off' },
      { value: 'entity', label: 'Track entity (person = current user priority)' },
      { value: 'true', label: 'Always track' },
    ];
    const trackValue = m.track === true ? 'true' : (m.track === 'entity' ? 'entity' : '');

    return html`
      <div class="marker-row">
        <div class="marker-row-header">
          <span class="marker-row-label">Marker ${i + 1}</span>
          <button class="remove-marker-btn" @click=${() => this._removeMarker(i)}>Remove</button>
        </div>
        <ha-selector
          .hass=${this.hass}
          .selector=${{
            entity: {
              filter: [
                { domain: 'device_tracker' },
                { domain: 'person' },
                { domain: 'zone' },
              ],
            },
          }}
          .value=${m.entity || ''}
          .label=${'Entity (device_tracker / person / zone)'}
          .markerIndex=${i}
          .markerField=${'entity'}
          @value-changed=${this._updateMarkerSelector}
        ></ha-selector>
        ${!m.entity ? html`
          <div class="side-by-side">
            <ha-textfield
              label="Latitude"
              .value=${m.latitude !== undefined ? String(m.latitude) : ''}
              .markerIndex=${i}
              .markerField=${'latitude'}
              @input=${this._updateMarkerFieldNumber}
            ></ha-textfield>
            <ha-textfield
              label="Longitude"
              .value=${m.longitude !== undefined ? String(m.longitude) : ''}
              .markerIndex=${i}
              .markerField=${'longitude'}
              @input=${this._updateMarkerFieldNumber}
            ></ha-textfield>
          </div>
        ` : ''}
        <ha-selector
          .hass=${this.hass}
          .selector=${{ select: { options: iconOptions } }}
          .value=${m.icon || 'default'}
          .label=${'Icon'}
          .markerIndex=${i}
          .markerField=${'icon'}
          @value-changed=${this._updateMarkerSelector}
        ></ha-selector>
        ${m.icon === 'entity_picture' ? html`
          <ha-textfield
            label="Icon Entity (auto-detected if blank)"
            .value=${m.icon_entity || ''}
            .markerIndex=${i}
            .markerField=${'icon_entity'}
            @input=${this._updateMarkerField}
          ></ha-textfield>
        ` : ''}
        <ha-selector
          .hass=${this.hass}
          .selector=${{ select: { options: trackOptions } }}
          .value=${trackValue}
          .label=${'Tracking'}
          .markerIndex=${i}
          .markerField=${'track'}
          @value-changed=${this._updateMarkerSelector}
        ></ha-selector>
        ${m.entity && m.icon !== 'entity_picture' ? html`
          <div class="marker-color-row">
            <span class="color-label">Icon colour</span>
            <input
              type="color"
              .value=${m.color || '#888888'}
              .markerIndex=${i}
              @input=${this._updateMarkerColor}
            />
            ${m.color ? html`
              <button class="clear-color-btn" @click=${() => this._clearMarkerColor(i)}>Reset</button>
            ` : ''}
          </div>
        ` : ''}
        ${m.entity && m.entity !== 'zone.home' && m.icon !== 'entity_picture' ? html`
          <ha-textfield
            label="Home suppression radius (m)"
            .value=${m.home_radius !== undefined ? String(m.home_radius) : ''}
            .markerIndex=${i}
            .markerField=${'home_radius'}
            @input=${this._updateMarkerFieldNumber}
            helper="Default 500 m — entity hidden when within this distance of home (0 = always show)"
          ></ha-textfield>
        ` : ''}
        <label class="marker-mobile-only">Mobile only
          <ha-switch
            .checked=${m.mobile_only === true}
            .markerIndex=${i}
            .markerField=${'mobile_only'}
            @change=${this._updateMarkerSwitch}
          ></ha-switch>
        </label>
      </div>
    `;
  }

  private _addMarker(): void {
    if (!this._config) return;
    const markers = [...(this._config.markers ?? []), {}];
    this._config = { ...this._config, markers };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _removeMarker(i: number): void {
    if (!this._config) return;
    const markers = (this._config.markers ?? []).filter((_, idx) => idx !== i);
    this._config = { ...this._config, markers };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _updateMarkerField(ev): void {
    if (!this._config) return;
    const target = ev.target;
    const i: number = target.markerIndex;
    const field: string = target.markerField;
    const value: string = target.value?.trim() ?? '';
    const markers = [...(this._config.markers ?? [])];
    markers[i] = { ...markers[i], [field]: value || undefined };
    this._config = { ...this._config, markers };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _updateMarkerFieldNumber(ev): void {
    if (!this._config) return;
    const target = ev.target;
    const i: number = target.markerIndex;
    const field: string = target.markerField;
    const raw: string = target.value?.trim() ?? '';
    const num = raw === '' ? undefined : parseFloat(raw);
    const markers = [...(this._config.markers ?? [])];
    markers[i] = { ...markers[i], [field]: num };
    this._config = { ...this._config, markers };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _updateMarkerSelector(ev: CustomEvent): void {
    if (!this._config) return;
    const target = ev.target as any;
    const i: number = target.markerIndex;
    const field: string = target.markerField;
    let value: any = ev.detail.value;
    if (field === 'track') {
      value = value === 'true' ? true : value === 'entity' ? 'entity' : undefined;
    } else if (value === '' || value === null) {
      value = undefined;
    }
    const markers = [...(this._config.markers ?? [])];
    markers[i] = { ...markers[i], [field]: value };
    this._config = { ...this._config, markers };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _updateMarkerColor(ev: Event): void {
    if (!this._config) return;
    const target = ev.target as HTMLInputElement & { markerIndex: number };
    const markers = [...(this._config.markers ?? [])];
    markers[target.markerIndex] = { ...markers[target.markerIndex], color: target.value };
    this._config = { ...this._config, markers };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _clearMarkerColor(i: number): void {
    if (!this._config) return;
    const markers = [...(this._config.markers ?? [])];
    const m = { ...markers[i] };
    delete m.color;
    markers[i] = m;
    this._config = { ...this._config, markers };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _updateMarkerSwitch(ev): void {
    if (!this._config) return;
    const target = ev.target;
    const i: number = target.markerIndex;
    const field: string = target.markerField;
    const markers = [...(this._config.markers ?? [])];
    markers[i] = { ...markers[i], [field]: target.checked || undefined };
    this._config = { ...this._config, markers };
    fireEvent(this, 'config-changed', { config: this._config });
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
        const newConfig = { ...this._config };
        delete newConfig[configValue];
        this._config = newConfig;
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
        const newConfig = { ...this._config };
        delete newConfig[configValue];
        this._config = newConfig;
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
    .marker-row {
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 8px;
    }
    .marker-row-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .marker-row-label {
      font-size: 0.85em;
      font-weight: 600;
      color: var(--secondary-text-color);
    }
    .remove-marker-btn {
      font-size: 0.8em;
      padding: 2px 8px;
      border: 1px solid var(--error-color, #f44336);
      border-radius: 4px;
      background: none;
      color: var(--error-color, #f44336);
      cursor: pointer;
    }
    .add-marker-btn {
      width: 100%;
      padding: 8px;
      border: 1px dashed var(--primary-color);
      border-radius: 6px;
      background: none;
      color: var(--primary-color);
      cursor: pointer;
      font-size: 0.9em;
      margin-bottom: 8px;
    }
    .marker-mobile-only {
      font-size: 0.85em;
    }
    .marker-color-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0 8px 0;
    }
    .color-label {
      font-size: 0.85em;
      color: var(--secondary-text-color);
      flex: 1;
    }
    input[type='color'] {
      width: 40px;
      height: 32px;
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      cursor: pointer;
      padding: 2px;
      background: none;
    }
    .clear-color-btn {
      font-size: 0.8em;
      padding: 2px 8px;
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      background: none;
      color: var(--secondary-text-color);
      cursor: pointer;
    }
  `;
}
