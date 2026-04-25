import { HomeAssistant } from 'custom-card-helpers';
import { Marker, WeatherRadarCardConfig } from './types';

const EARTH_RADIUS_M = 6_371_000;
export const HOME_SUPPRESS_RADIUS_M = 500;

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const φ1 = lat1 * toRad;
  const φ2 = lat2 * toRad;
  const Δφ = (lat2 - lat1) * toRad;
  const Δλ = (lon2 - lon1) * toRad;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isAtHome(
  markerCfg: Marker,
  lat: number,
  lon: number,
  homeLat: number,
  homeLon: number,
  hass?: HomeAssistant,
): boolean {
  if (!markerCfg.entity) return false;
  // Zones are places on the map — suppress logic doesn't apply to them.
  if (markerCfg.entity.startsWith('zone.')) return false;
  // home_radius: 0 disables suppression entirely, even if state='home'.
  const radius = markerCfg.home_radius ?? HOME_SUPPRESS_RADIUS_M;
  if (radius <= 0) return false;
  // HA's own state is authoritative — GPS drift can't fool it.
  const entityState = hass?.states[markerCfg.entity]?.state;
  if (entityState === 'home') return true;
  // Fallback: GPS distance check for when HA hasn't yet registered 'home'.
  return distanceMeters(lat, lon, homeLat, homeLon) < radius;
}

export function migrateConfig(config: WeatherRadarCardConfig): WeatherRadarCardConfig {
  if (config.markers !== undefined) return config;
  if (config.show_marker !== true && config.marker_latitude === undefined && config.mobile_marker_latitude === undefined) return config;

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
): { lat: number; lon: number } | null {
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
  // Don't pan to the winner if it's at home — same rule as rendering suppression.
  if (isAtHome(markers[winnerIdx], pos.lat, pos.lon, fallbackLat, fallbackLon, hass)) return null;
  return pos;
}
