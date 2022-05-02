import { LovelaceCardConfig } from 'custom-card-helpers';

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
  extra_labels: undefined;
  frame_count: undefined;
  frame_delay: undefined;
  marker_longitude: undefined;
  marker_latitude: undefined;
  center_longitude: undefined;
  center_latitude: undefined;
  zoom_level: undefined;
  type: string;
  name?: string;
  map_style?: string;
  show_warning?: boolean;
  show_error?: boolean;
  test_gui?: boolean;
  show_header_toggle?: boolean;
}
