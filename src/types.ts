import { LovelaceCardConfig } from 'custom-card-helpers';

export interface Marker {
  entity?: string;
  latitude?: number;
  longitude?: number;
  icon?: string;       // "default" | "entity_picture" | "mdi:icon-name"
  icon_entity?: string;
  track?: 'entity' | true;
  mobile_only?: boolean;
}

// Entity coordinate configuration for dynamic location from entity attributes
export interface EntityCoordinate {
  entity: string;
  latitude_attribute?: string; // Default: 'latitude'
  longitude_attribute?: string; // Default: 'longitude'
}

// Coordinate can be a number, entity ID string, or entity config object
export type CoordinateConfig = number | string | EntityCoordinate;

export interface WeatherRadarCardConfig extends LovelaceCardConfig {
  show_range: boolean;
  show_scale: boolean;
  show_playback: boolean;
  show_recenter: boolean;
  static_map: boolean;
  show_zoom: boolean;
  square_map: boolean;
  height?: string;
  width?: string;
  extra_labels?: boolean;
  frame_count?: number;
  frame_delay?: number;
  animated_transitions?: boolean;
  transition_time?: number;
  center_longitude?: CoordinateConfig;
  center_latitude?: CoordinateConfig;
  zoom_level?: number;
  markers?: Marker[];
  // Legacy single-marker fields — read-only; used only by _migrateConfig()
  /** @deprecated use markers[] */  show_marker?: boolean;
  /** @deprecated use markers[] */  marker_latitude?: CoordinateConfig;
  /** @deprecated use markers[] */  marker_longitude?: CoordinateConfig;
  /** @deprecated use markers[] */  mobile_marker_latitude?: CoordinateConfig;
  /** @deprecated use markers[] */  mobile_marker_longitude?: CoordinateConfig;
  /** @deprecated use markers[] */  mobile_center_latitude?: CoordinateConfig;
  /** @deprecated use markers[] */  mobile_center_longitude?: CoordinateConfig;
  /** @deprecated use markers[] */  marker_icon?: string;
  /** @deprecated use markers[] */  marker_icon_entity?: string;
  /** @deprecated use markers[] */  mobile_marker_icon?: string;
  /** @deprecated use markers[] */  mobile_marker_icon_entity?: string;
  type: string;
  name?: string;
  map_style?: string;
  data_source?: string;
  show_snow?: boolean;
  show_progress_bar?: boolean;
  show_color_bar?: boolean;
  // Simple shortcut string OR a standard HA action object e.g. {action: navigate, navigation_path: /lovelace/1}
  double_tap_action?: string | { action: string; [key: string]: unknown };
  disable_scroll?: boolean;
  show_warning?: boolean;
  show_error?: boolean;
  test_gui?: boolean;
  show_header_toggle?: boolean;
}
