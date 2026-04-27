import { HomeAssistant } from 'custom-card-helpers';

interface EntityState {
  state?: string;
  attributes?: Record<string, unknown>;
}

interface MockHassOptions {
  userId?: string;
  states?: Record<string, EntityState>;
  haLat?: number;
  haLon?: number;
}

export function mockHass(options: MockHassOptions = {}): HomeAssistant {
  return {
    user: {
      id: options.userId ?? 'user-123',
      is_admin: false,
      is_owner: false,
      name: 'Test User',
      credentials: [],
    },
    config: {
      latitude: options.haLat ?? -33.86,
      longitude: options.haLon ?? 151.21,
    },
    states: (options.states ?? {}) as HomeAssistant['states'],
  } as unknown as HomeAssistant;
}

export function entityState(
  lat: number | string,
  lon: number | string,
  extra: Record<string, unknown> = {},
): EntityState {
  return {
    state: 'not_home',
    attributes: { latitude: lat, longitude: lon, ...extra },
  };
}

export function entityStateHome(
  lat: number | string,
  lon: number | string,
  extra: Record<string, unknown> = {},
): EntityState {
  return {
    state: 'home',
    attributes: { latitude: lat, longitude: lon, ...extra },
  };
}
