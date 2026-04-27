import { HomeAssistant } from 'custom-card-helpers';
import { Marker, WeatherRadarCardConfig } from './types';

export function migrateConfig(config: WeatherRadarCardConfig): WeatherRadarCardConfig {
  // markers explicitly set (including empty array) — respect the user's choice
  if (config.markers !== undefined) return config;

  // Explicit show_marker:false — user wants no marker
  if (config.show_marker === false) return { ...config, markers: [] };

  // No legacy fields and no markers — default to a home zone marker
  if (config.show_marker !== true && config.marker_latitude === undefined && config.mobile_marker_latitude === undefined) {
    return { ...config, markers: [{ entity: 'zone.home' }] };
  }

  const markers: Marker[] = [];
  const latCfg = config.marker_latitude;
  const lonCfg = config.marker_longitude;
  const m: Marker = {};

  if (latCfg === undefined && lonCfg === undefined) {
    // No position given — default to the home zone so the marker is always visible.
    m.entity = 'zone.home';
  } else if (typeof latCfg === 'string' && latCfg === lonCfg) {
    m.entity = latCfg;
  } else {
    if (typeof latCfg === 'number') m.latitude = latCfg;
    if (typeof lonCfg === 'number') m.longitude = lonCfg;
    if (typeof latCfg === 'string') m.entity = latCfg;
  }
  if (config.marker_icon) m.icon = config.marker_icon;
  if (config.marker_icon_entity) m.icon_entity = config.marker_icon_entity;
  markers.push(m);

  const mLat = config.mobile_marker_latitude;
  const mLon = config.mobile_marker_longitude;
  if ((mLat !== undefined || mLon !== undefined) && (mLat !== latCfg || mLon !== lonCfg)) {
    const mm: Marker = { mobile_only: true };
    if (typeof mLat === 'string' && mLat === mLon) {
      mm.entity = mLat;
    } else {
      if (typeof mLat === 'number') mm.latitude = mLat;
      if (typeof mLon === 'number') mm.longitude = mLon;
      if (typeof mLat === 'string') mm.entity = mLat;
    }
    if (config.mobile_marker_icon) mm.icon = config.mobile_marker_icon;
    if (config.mobile_marker_icon_entity) mm.icon_entity = config.mobile_marker_icon_entity;
    markers.push(mm);
  }

  return { ...config, markers };
}

export function resolveMarkerPosition(
  markerCfg: Marker,
  hass: HomeAssistant | undefined,
  fallbackLat: number,
  fallbackLon: number,
): { lat: number; lon: number } {
  if (markerCfg.entity) {
    const state = hass?.states[markerCfg.entity];
    const lat = parseFloat(state?.attributes?.latitude as string);
    const lon = parseFloat(state?.attributes?.longitude as string);
    if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
  }
  return {
    lat: markerCfg.latitude ?? fallbackLat,
    lon: markerCfg.longitude ?? fallbackLon,
  };
}

export function resolveTracking(
  markers: Marker[],
  hass: HomeAssistant | undefined,
  fallbackLat: number,
  fallbackLon: number,
): { lat: number; lon: number; markerIndex: number } | null {
  const userId = hass?.user?.id;
  let winnerIdx = -1;
  let winnerPriority = 0;

  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    if (!m.track) continue;

    let p = 0;
    if (m.track === 'entity' && m.entity) {
      const state = hass?.states[m.entity];
      if (m.entity.startsWith('person.') && state?.attributes?.user_id === userId) {
        p = 3;
      } else {
        p = 2;
      }
    } else if (m.track === true) {
      p = 1;
    }
    if (p === 0) continue;

    if (p > winnerPriority) {
      winnerIdx = i;
      winnerPriority = p;
    } else if (p === winnerPriority) {
      console.warn('Weather Radar Card: multiple markers at the same track priority — using first');
    }
  }

  if (winnerIdx < 0) return null;
  const pos = resolveMarkerPosition(markers[winnerIdx], hass, fallbackLat, fallbackLon);
  return { ...pos, markerIndex: winnerIdx };
}
