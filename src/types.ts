import { LovelaceCardConfig } from 'custom-card-helpers';

// Entity coordinate configuration for dynamic location from entity attributes
export interface EntityCoordinate {
  entity: string;
  latitude_attribute?: string; // Default: 'latitude'
  longitude_attribute?: string; // Default: 'longitude'
}

// Coordinate can be a number, entity ID string, or entity config object
export type CoordinateConfig = number | string | EntityCoordinate;

// TODO Add your configuration elements here for type-checking
export interface WeatherRadarCardConfig extends LovelaceCardConfig {
  show_range: boolean;
  show_marker: boolean;
  show_scale: boolean;
  show_playback: boolean;
  show_recenter: boolean;
  static_map: boolean;
  show_zoom: boolean;
  square_map: boolean;
  height?: string;
  width?: string;
  extra_labels: undefined;
  frame_count: undefined;
  frame_delay: undefined;
  // Base coordinates (used on all devices)
  marker_longitude?: CoordinateConfig;
  marker_latitude?: CoordinateConfig;
  center_longitude?: CoordinateConfig;
  center_latitude?: CoordinateConfig;
  // Mobile-specific overrides (used when device detected as mobile)
  mobile_marker_longitude?: CoordinateConfig;
  mobile_marker_latitude?: CoordinateConfig;
  mobile_center_longitude?: CoordinateConfig;
  mobile_center_latitude?: CoordinateConfig;
  // Marker icon configuration
  marker_icon?: string; // "default" | "entity_picture" | "mdi:icon-name"
  marker_icon_entity?: string; // Entity ID for entity_picture source
  mobile_marker_icon?: string; // Mobile override for marker icon type
  mobile_marker_icon_entity?: string; // Mobile override for icon entity
  zoom_level: undefined;
  type: string;
  name?: string;
  map_style?: string;
  show_warning?: boolean;
  show_error?: boolean;
  test_gui?: boolean;
  show_header_toggle?: boolean;
}
