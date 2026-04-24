import { HomeAssistant } from 'custom-card-helpers';
import { CoordinateConfig } from './types';

export function isMobileDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes('home assistant') ||
    window.innerWidth <= 768 ||
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)
  );
}

export function getCurrentUserInfo(
  hass: HomeAssistant | undefined,
): { personEntity: string; deviceTracker?: string } | null {
  const userId = hass?.user?.id;
  if (!userId) return null;
  for (const [entityId, state] of Object.entries(hass?.states || {})) {
    if (entityId.startsWith('person.') && state.attributes?.user_id === userId) {
      const trackers = state.attributes?.device_trackers;
      const deviceTracker = Array.isArray(trackers)
        ? trackers[0]
        : typeof trackers === 'string'
          ? trackers.split(',')[0].trim()
          : undefined;
      return { personEntity: entityId, deviceTracker };
    }
  }
  return null;
}

export function getCoordinateConfig(
  baseConfig: CoordinateConfig | undefined,
  mobileConfig: CoordinateConfig | undefined,
  isMobile: boolean,
  userDeviceTracker?: string,
): CoordinateConfig | undefined {
  if (isMobile && mobileConfig !== undefined) return mobileConfig;
  if (isMobile && !baseConfig && userDeviceTracker) return userDeviceTracker;
  return baseConfig;
}

export function resolveCoordinate(
  config: CoordinateConfig | undefined,
  coordType: 'latitude' | 'longitude',
  fallback: number,
  hass: HomeAssistant | undefined,
): number {
  if (config === undefined || config === null) return fallback;
  if (typeof config === 'number') return config;
  if (typeof config === 'string') {
    const val = hass?.states[config]?.attributes?.[coordType];
    if (val === undefined) return fallback;
    const num = parseFloat(val);
    return !isNaN(num) ? num : fallback;
  }
  if (typeof config === 'object' && 'entity' in config) {
    const attr =
      coordType === 'latitude'
        ? config.latitude_attribute || 'latitude'
        : config.longitude_attribute || 'longitude';
    const val = hass?.states[config.entity]?.attributes?.[attr];
    if (val === undefined) return fallback;
    const num = parseFloat(val);
    return !isNaN(num) ? num : fallback;
  }
  return fallback;
}

export function resolveCoordinatePair(
  latConfig: CoordinateConfig | undefined,
  lonConfig: CoordinateConfig | undefined,
  fallbackLat: number,
  fallbackLon: number,
  hass: HomeAssistant | undefined,
): { lat: number; lon: number } {
  if (
    typeof latConfig === 'string' &&
    typeof lonConfig === 'string' &&
    latConfig === lonConfig
  ) {
    const entity = hass?.states[latConfig];
    if (entity?.attributes?.latitude && entity?.attributes?.longitude) {
      const lat = parseFloat(entity.attributes.latitude);
      const lon = parseFloat(entity.attributes.longitude);
      if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
    }
  }
  return {
    lat: resolveCoordinate(latConfig, 'latitude', fallbackLat, hass),
    lon: resolveCoordinate(lonConfig, 'longitude', fallbackLon, hass),
  };
}
