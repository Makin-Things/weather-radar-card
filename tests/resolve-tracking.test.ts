import { describe, it, expect, vi } from 'vitest';
import { resolveTracking } from '../src/marker-utils';
import { mockHass, entityState } from './helpers/mock-hass';
import { Marker } from '../src/types';

const FB_LAT = -33.86;
const FB_LON = 151.21;

describe('resolveTracking', () => {
  it('returns null when no markers have track set', () => {
    expect(resolveTracking([{ latitude: -34, longitude: 151 }], mockHass(), FB_LAT, FB_LON)).toBeNull();
  });

  it('returns null for an empty markers array', () => {
    expect(resolveTracking([], mockHass(), FB_LAT, FB_LON)).toBeNull();
  });

  it('returns null when hass is undefined and no tracked markers', () => {
    expect(resolveTracking([{ latitude: -34, longitude: 151 }], undefined, FB_LAT, FB_LON)).toBeNull();
  });

  // ── track: true (priority 1) ──────────────────────────────────────────────

  it('follows track:true marker using entity position', () => {
    const hass = mockHass({ states: { 'device_tracker.van': entityState(-34, 152) } });
    const markers: Marker[] = [{ entity: 'device_tracker.van', track: true }];
    expect(resolveTracking(markers, hass, FB_LAT, FB_LON)).toEqual({ lat: -34, lon: 152 });
  });

  it('follows track:true marker using static position', () => {
    const markers: Marker[] = [{ latitude: -34, longitude: 151, track: true }];
    expect(resolveTracking(markers, mockHass(), FB_LAT, FB_LON)).toEqual({ lat: -34, lon: 151 });
  });

  // ── track: entity non-person (priority 2) ────────────────────────────────

  it('follows track:entity on a device_tracker (priority 2)', () => {
    const hass = mockHass({ states: { 'device_tracker.van': entityState(-34, 152) } });
    const markers: Marker[] = [{ entity: 'device_tracker.van', track: 'entity' }];
    expect(resolveTracking(markers, hass, FB_LAT, FB_LON)).toEqual({ lat: -34, lon: 152 });
  });

  it('track:entity on a non-person entity beats track:true', () => {
    const hass = mockHass({ states: {
      'device_tracker.van': entityState(-34, 152),
      'device_tracker.bike': entityState(-35, 151),
    }});
    const markers: Marker[] = [
      { entity: 'device_tracker.bike', track: true },
      { entity: 'device_tracker.van', track: 'entity' },
    ];
    expect(resolveTracking(markers, hass, FB_LAT, FB_LON)).toEqual({ lat: -34, lon: 152 });
  });

  // ── track: entity person matching current user (priority 3) ──────────────

  it('follows track:entity on person.* matching hass.user.id (priority 3)', () => {
    const hass = mockHass({
      userId: 'user-abc',
      states: {
        'person.john': { state: 'home', attributes: { latitude: -35, longitude: 149, user_id: 'user-abc' } },
      },
    });
    const markers: Marker[] = [{ entity: 'person.john', track: 'entity' }];
    expect(resolveTracking(markers, hass, FB_LAT, FB_LON)).toEqual({ lat: -35, lon: 149 });
  });

  it('matching person (p3) beats device_tracker (p2) regardless of list order', () => {
    const hass = mockHass({
      userId: 'user-abc',
      states: {
        'device_tracker.van': entityState(-36, 150),
        'person.john': { state: 'home', attributes: { latitude: -35, longitude: 149, user_id: 'user-abc' } },
      },
    });
    const markers: Marker[] = [
      { entity: 'device_tracker.van', track: 'entity' },
      { entity: 'person.john', track: 'entity' },
    ];
    expect(resolveTracking(markers, hass, FB_LAT, FB_LON)).toEqual({ lat: -35, lon: 149 });
  });

  it('person with non-matching user_id is treated as priority 2, not 3', () => {
    const hass = mockHass({
      userId: 'user-abc',
      states: {
        'person.jane': { state: 'home', attributes: { latitude: -35, longitude: 149, user_id: 'user-xyz' } },
      },
    });
    // person.jane doesn't match — still tracked as p2
    const markers: Marker[] = [{ entity: 'person.jane', track: 'entity' }];
    const result = resolveTracking(markers, hass, FB_LAT, FB_LON);
    expect(result).toEqual({ lat: -35, lon: 149 });
  });

  // ── Tie-breaking ──────────────────────────────────────────────────────────

  it('warns and uses first when two track:true markers tie', () => {
    const hass = mockHass({ states: {
      'device_tracker.a': entityState(-34, 152),
      'device_tracker.b': entityState(-35, 151),
    }});
    const markers: Marker[] = [
      { entity: 'device_tracker.a', track: true },
      { entity: 'device_tracker.b', track: true },
    ];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = resolveTracking(markers, hass, FB_LAT, FB_LON);
    expect(result).toEqual({ lat: -34, lon: 152 });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('priority'));
    warn.mockRestore();
  });

  it('warns and uses first when two track:entity markers tie at p2', () => {
    const hass = mockHass({
      userId: 'user-abc',
      states: {
        'person.jane': { state: 'home', attributes: { latitude: -35, longitude: 149, user_id: 'user-xyz' } },
        'device_tracker.van': entityState(-36, 150),
      },
    });
    const markers: Marker[] = [
      { entity: 'person.jane', track: 'entity' },
      { entity: 'device_tracker.van', track: 'entity' },
    ];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = resolveTracking(markers, hass, FB_LAT, FB_LON);
    expect(result).toEqual({ lat: -35, lon: 149 }); // first wins
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  // ── Unavailable entities ──────────────────────────────────────────────────

  it('returns static fallback position when tracked entity is missing from hass states', () => {
    const hass = mockHass({ states: {} });
    const markers: Marker[] = [{ entity: 'device_tracker.ghost', latitude: -34, longitude: 151, track: 'entity' }];
    expect(resolveTracking(markers, hass, FB_LAT, FB_LON)).toEqual({ lat: -34, lon: 151 });
  });

  it('returns fallback coords when tracked entity has no lat/lon and no static position set', () => {
    const hass = mockHass({ states: { 'sensor.temp': { state: '22', attributes: {} } } });
    const markers: Marker[] = [{ entity: 'sensor.temp', track: 'entity' }];
    expect(resolveTracking(markers, hass, FB_LAT, FB_LON)).toEqual({ lat: FB_LAT, lon: FB_LON });
  });

  it('returns result when hass is undefined (uses static position)', () => {
    const markers: Marker[] = [{ latitude: -34, longitude: 151, track: true }];
    expect(resolveTracking(markers, undefined, FB_LAT, FB_LON)).toEqual({ lat: -34, lon: 151 });
  });

  // ── track:entity with no entity field ────────────────────────────────────

  it('skips track:entity marker that has no entity field', () => {
    // track:'entity' with no entity → p=0 → skipped
    const markers: Marker[] = [{ track: 'entity' }];
    expect(resolveTracking(markers, mockHass(), FB_LAT, FB_LON)).toBeNull();
  });
});
