import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockHass } from './helpers/mock-hass';

// Mock Leaflet before importing marker-icon (vi.mock is hoisted)
vi.mock('leaflet', () => {
  const icon = vi.fn((opts: object) => ({ _type: 'icon', ...opts }));
  const divIcon = vi.fn((opts: object) => ({ _type: 'divIcon', ...opts }));
  return { icon, divIcon, default: { icon, divIcon } };
});

import {
  createMarkerIconForMarker,
  findPersonEntityForDeviceTracker,
  resolveEntityPicture,
  resolveToPersonEntity,
} from '../src/marker-icon';

beforeEach(() => { vi.clearAllMocks(); });

// ── createMarkerIconForMarker ────────────────────────────────────────────────

describe('createMarkerIconForMarker', () => {
  it('returns default icon (dark SVG) on a light map style', () => {
    const result = createMarkerIconForMarker({}, mockHass(), 'light') as any;
    expect(result._type).toBe('icon');
    expect(result.iconUrl).toContain('home-circle-dark.svg');
  });

  it('uses light SVG on dark map style', () => {
    const result = createMarkerIconForMarker({ icon: 'default' }, mockHass(), 'dark') as any;
    expect(result._type).toBe('icon');
    expect(result.iconUrl).toContain('home-circle-light.svg');
  });

  it('uses light SVG on satellite map style', () => {
    const result = createMarkerIconForMarker({ icon: 'default' }, mockHass(), 'satellite') as any;
    expect(result.iconUrl).toContain('home-circle-light.svg');
  });

  it('returns entity_picture icon when entity has a picture URL', () => {
    const hass = mockHass({
      states: {
        'person.john': { state: 'home', attributes: { entity_picture: '/api/image/john.jpg', latitude: -34, longitude: 151 } },
      },
    });
    const result = createMarkerIconForMarker({ icon: 'entity_picture', entity: 'person.john' }, hass, 'light') as any;
    expect(result._type).toBe('icon');
    expect(result.iconUrl).toBe('/api/image/john.jpg');
    expect(result.className).toBe('marker-entity-picture');
  });

  it('uses icon_entity in preference to entity for picture lookup', () => {
    const hass = mockHass({
      states: {
        'person.john': { state: 'home', attributes: { entity_picture: '/api/image/john.jpg' } },
        'person.other': { state: 'home', attributes: { entity_picture: '/api/image/other.jpg' } },
      },
    });
    const result = createMarkerIconForMarker(
      { icon: 'entity_picture', entity: 'person.other', icon_entity: 'person.john' },
      hass, 'light',
    ) as any;
    expect(result.iconUrl).toBe('/api/image/john.jpg');
  });

  it('falls back to default when entity has no entity_picture attribute', () => {
    const hass = mockHass({
      states: { 'person.john': { state: 'home', attributes: { latitude: -34, longitude: 151 } } },
    });
    const result = createMarkerIconForMarker({ icon: 'entity_picture', entity: 'person.john' }, hass, 'light') as any;
    expect(result._type).toBe('icon');
    expect(result.iconUrl).toContain('home-circle');
  });

  it('falls back to default when entity is missing from states', () => {
    const result = createMarkerIconForMarker({ icon: 'entity_picture', entity: 'person.missing' }, mockHass({ states: {} }), 'light') as any;
    expect(result.iconUrl).toContain('home-circle');
  });

  it('returns MDI divIcon for a known icon name on a light map', () => {
    const result = createMarkerIconForMarker({ icon: 'mdi:home' }, mockHass(), 'light') as any;
    expect(result._type).toBe('divIcon');
    expect(result.html).toContain('<svg');
    expect(result.html).toContain('#333333');
  });

  it('uses light fill colour on dark map style for MDI icon', () => {
    const result = createMarkerIconForMarker({ icon: 'mdi:home' }, mockHass(), 'dark') as any;
    expect(result.html).toContain('#EEEEEE');
  });

  it('uses light fill colour on satellite map style for MDI icon', () => {
    const result = createMarkerIconForMarker({ icon: 'mdi:home' }, mockHass(), 'satellite') as any;
    expect(result.html).toContain('#EEEEEE');
  });

  it('falls back to default for an unknown MDI icon name', () => {
    const result = createMarkerIconForMarker({ icon: 'mdi:totally-unknown-xyz' }, mockHass(), 'light') as any;
    expect(result._type).toBe('icon');
    expect(result.iconUrl).toContain('home-circle');
  });

  it('falls back to default for an mdi: prefix with empty name', () => {
    const result = createMarkerIconForMarker({ icon: 'mdi:' }, mockHass(), 'light') as any;
    expect(result._type).toBe('icon');
  });
});

// ── findPersonEntityForDeviceTracker ─────────────────────────────────────────

describe('findPersonEntityForDeviceTracker', () => {
  it('returns the person entity when tracker is in their device_trackers array', () => {
    const hass = mockHass({
      states: {
        'person.john': { state: 'home', attributes: { device_trackers: ['device_tracker.phone'] } },
      },
    });
    expect(findPersonEntityForDeviceTracker('device_tracker.phone', hass)).toBe('person.john');
  });

  it('returns undefined when no person has that device tracker', () => {
    const hass = mockHass({ states: {} });
    expect(findPersonEntityForDeviceTracker('device_tracker.phone', hass)).toBeUndefined();
  });

  it('returns undefined when person exists but tracker is not in their list', () => {
    const hass = mockHass({
      states: {
        'person.john': { state: 'home', attributes: { device_trackers: ['device_tracker.tablet'] } },
      },
    });
    expect(findPersonEntityForDeviceTracker('device_tracker.phone', hass)).toBeUndefined();
  });
});

// ── resolveEntityPicture ─────────────────────────────────────────────────────

describe('resolveEntityPicture', () => {
  it('returns the picture URL when entity has entity_picture attribute', () => {
    const hass = mockHass({
      states: { 'person.john': { state: 'home', attributes: { entity_picture: '/api/img.jpg' } } },
    });
    expect(resolveEntityPicture('person.john', hass)).toBe('/api/img.jpg');
  });

  it('returns null for undefined entityId', () => {
    expect(resolveEntityPicture(undefined, mockHass())).toBeNull();
  });

  it('returns null when entity is missing from states', () => {
    expect(resolveEntityPicture('person.missing', mockHass({ states: {} }))).toBeNull();
  });

  it('returns null when entity has no entity_picture attribute', () => {
    const hass = mockHass({ states: { 'person.john': { state: 'home', attributes: {} } } });
    expect(resolveEntityPicture('person.john', hass)).toBeNull();
  });
});

// ── resolveToPersonEntity ────────────────────────────────────────────────────

describe('resolveToPersonEntity', () => {
  it('maps a device_tracker to its person entity', () => {
    const hass = mockHass({
      states: {
        'person.john': { state: 'home', attributes: { device_trackers: ['device_tracker.phone'] } },
      },
    });
    expect(resolveToPersonEntity('device_tracker.phone', hass)).toBe('person.john');
  });

  it('returns entity unchanged when it is already a person entity', () => {
    expect(resolveToPersonEntity('person.john', mockHass())).toBe('person.john');
  });

  it('returns device_tracker unchanged when no matching person found', () => {
    const hass = mockHass({ states: {} });
    expect(resolveToPersonEntity('device_tracker.phone', hass)).toBe('device_tracker.phone');
  });

  it('returns non-tracker entity unchanged', () => {
    expect(resolveToPersonEntity('zone.home', mockHass())).toBe('zone.home');
  });
});
