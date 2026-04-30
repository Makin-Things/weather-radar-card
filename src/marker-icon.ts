/* eslint-disable @typescript-eslint/no-explicit-any */
import * as L from 'leaflet';
import { HomeAssistant } from 'custom-card-helpers';
import { Marker } from './types';

const ICON_BASE = '/local/community/weather-radar-card/';

// Used only for the default home-circle marker when a custom colour is set,
// and inside cluster badges (where embedding <ha-icon> would race with cluster
// re-renders). Other MDI icons are rendered via <ha-icon> which can resolve
// any name from HA's bundled icon database — no hardcoded path table needed.
export const HOME_CIRCLE_PATH =
  'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M10,17V13H8L12,7L16,13H14V17H10Z';

// Plain mdi:home (house silhouette, no surrounding circle) — fallback for the
// zone-cluster badge representation when no MDI icon is available on the
// representative marker (e.g. legacy default markers with no entity).
export const HOME_PATH = 'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z';

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

export function createMarkerIconForMarker(
  markerCfg: Marker,
  hass: HomeAssistant,
  mapStyle: string,
): L.Icon | L.DivIcon {
  const iconType = markerCfg.icon || 'default';
  const isDarkMap = mapStyle === 'dark' || mapStyle === 'satellite';
  const svgFile = isDarkMap ? 'home-circle-light.svg' : 'home-circle-dark.svg';
  const defaultColour = isDarkMap ? '#EEEEEE' : '#333333';
  const colour = markerCfg.color ?? defaultColour;

  // For default icon: use inline SVG when a custom colour is set, external file otherwise.
  if (iconType === 'default') {
    if (markerCfg.color) {
      return L.divIcon({
        html: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="${colour}" d="${HOME_CIRCLE_PATH}"/></svg>`,
        iconSize: [16, 16],
        className: 'marker-mdi-icon',
      });
    }
    return L.icon({ iconUrl: `${ICON_BASE}${svgFile}`, iconSize: [16, 16] });
  }

  if (iconType === 'entity_picture') {
    const entityId = markerCfg.icon_entity || markerCfg.entity;
    const resolved = entityId ? resolveToPersonEntity(entityId, hass) : undefined;
    const pictureUrl = resolveEntityPicture(resolved, hass);
    if (!pictureUrl) return L.icon({ iconUrl: `${ICON_BASE}${svgFile}`, iconSize: [16, 16] });
    return L.icon({ iconUrl: pictureUrl, iconSize: [32, 32], className: 'marker-entity-picture' });
  }

  if (iconType.startsWith('mdi:') && iconType.length > 4) {
    // <ha-icon> is registered globally by HA frontend and resolves any MDI
    // icon from HA's bundled database — no need to ship our own path table.
    return L.divIcon({
      html: `<ha-icon icon="${iconType}" style="--mdc-icon-size: 24px; color: ${colour};"></ha-icon>`,
      iconSize: [24, 24],
      className: 'marker-mdi-icon',
    });
  }

  return L.icon({ iconUrl: `${ICON_BASE}${svgFile}`, iconSize: [16, 16] });
}

