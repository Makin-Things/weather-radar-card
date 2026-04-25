/* eslint-disable @typescript-eslint/no-explicit-any */
import * as L from 'leaflet';
import { HomeAssistant } from 'custom-card-helpers';
import { WeatherRadarCardConfig, Marker } from './types';

const ICON_BASE = '/local/community/weather-radar-card/';

export const MDI_PATHS: Record<string, string> = {
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

export function findPersonEntityForDeviceTracker(
  deviceTrackerId: string,
  hass: HomeAssistant,
): string | undefined {
  for (const [entityId, state] of Object.entries(hass?.states || {})) {
    if (!entityId.startsWith('person.')) continue;
    const trackers = state.attributes?.device_trackers;
    if (Array.isArray(trackers) && trackers.includes(deviceTrackerId)) return entityId;
  }
  return undefined;
}

export function resolveToPersonEntity(entityId: string, hass: HomeAssistant): string {
  if (entityId.startsWith('device_tracker.')) {
    return findPersonEntityForDeviceTracker(entityId, hass) ?? entityId;
  }
  return entityId;
}

export function resolveEntityPicture(
  entityId: string | undefined,
  hass: HomeAssistant,
): string | null {
  if (!entityId) return null;
  return hass?.states[entityId]?.attributes?.entity_picture ?? null;
}

export function getMarkerIconConfig(
  config: WeatherRadarCardConfig,
  hass: HomeAssistant,
  isMobile: boolean,
  userInfo: { personEntity: string; deviceTracker?: string } | null,
): { type: string; entity?: string } {
  // Mobile falls back to the desktop icon type (not entity_picture) when unset.
  // Use || so that the editor's empty-string "Same as desktop" sentinel also falls through.
  const iconType = isMobile
    ? (config.mobile_marker_icon || config.marker_icon || 'default')
    : (config.marker_icon || 'default');
  let iconEntity = isMobile ? config.mobile_marker_icon_entity : config.marker_icon_entity;

  if (iconType === 'entity_picture' && !iconEntity) {
    const latCfg = isMobile
      ? (config.mobile_marker_latitude ?? config.marker_latitude)
      : config.marker_latitude;
    if (typeof latCfg === 'string') iconEntity = resolveToPersonEntity(latCfg, hass);

    if (!iconEntity) {
      const cLat = isMobile
        ? (config.mobile_center_latitude ?? config.center_latitude)
        : config.center_latitude;
      if (typeof cLat === 'string') iconEntity = resolveToPersonEntity(cLat, hass);
    }
    if (!iconEntity && userInfo?.personEntity) iconEntity = userInfo.personEntity;
  }
  return { type: iconType, entity: iconEntity };
}

export function createMarkerIconForMarker(
  markerCfg: Marker,
  hass: HomeAssistant,
  mapStyle: string,
): L.Icon | L.DivIcon {
  const iconType = markerCfg.icon || 'default';
  const svgFile = mapStyle === 'dark' ? 'home-circle-light.svg' : 'home-circle-dark.svg';
  const defaultIcon = () => L.icon({ iconUrl: `${ICON_BASE}${svgFile}`, iconSize: [16, 16] });

  if (iconType === 'default') return defaultIcon();

  if (iconType === 'entity_picture') {
    const entityId = markerCfg.icon_entity || markerCfg.entity;
    const resolved = entityId ? resolveToPersonEntity(entityId, hass) : undefined;
    const pictureUrl = resolveEntityPicture(resolved, hass);
    if (!pictureUrl) return defaultIcon();
    return L.icon({ iconUrl: pictureUrl, iconSize: [32, 32], className: 'marker-entity-picture' });
  }

  if (iconType.startsWith('mdi:')) {
    const name = iconType.substring(4);
    const path = MDI_PATHS[name];
    if (!path) return defaultIcon();
    const colour = mapStyle === 'dark' || mapStyle === 'satellite' ? '#EEEEEE' : '#333333';
    return L.divIcon({
      html: `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="${colour}" d="${path}"/></svg>`,
      iconSize: [24, 24],
      className: 'marker-mdi-icon',
    });
  }

  return defaultIcon();
}

export function createMarkerIcon(
  config: WeatherRadarCardConfig,
  hass: HomeAssistant,
  isMobile: boolean,
  userInfo: { personEntity: string; deviceTracker?: string } | null,
  mapStyle: string,
): L.Icon | L.DivIcon {
  const iconCfg = getMarkerIconConfig(config, hass, isMobile, userInfo);
  const svgFile = mapStyle === 'dark' ? 'home-circle-light.svg' : 'home-circle-dark.svg';
  const defaultIcon = () => L.icon({ iconUrl: `${ICON_BASE}${svgFile}`, iconSize: [16, 16] });

  if (!iconCfg.type || iconCfg.type === 'default') return defaultIcon();

  if (iconCfg.type === 'entity_picture') {
    const pictureUrl = resolveEntityPicture(iconCfg.entity, hass);
    if (!pictureUrl) return defaultIcon();
    return L.icon({ iconUrl: pictureUrl, iconSize: [32, 32], className: 'marker-entity-picture' });
  }

  if (iconCfg.type.startsWith('mdi:')) {
    const name = iconCfg.type.substring(4);
    const path = MDI_PATHS[name];
    if (!path) return defaultIcon();
    const colour = mapStyle === 'dark' || mapStyle === 'satellite' ? '#EEEEEE' : '#333333';
    return L.divIcon({
      html: `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="${colour}" d="${path}"/></svg>`,
      iconSize: [24, 24],
      className: 'marker-mdi-icon',
    });
  }

  return defaultIcon();
}
