import { describe, it, expect } from 'vitest';
import { distanceMeters, isAtHome, HOME_SUPPRESS_RADIUS_M } from '../src/marker-utils';
import { mockHass, entityStateHome } from './helpers/mock-hass';

describe('distanceMeters', () => {
  it('returns 0 for identical coordinates', () => {
    expect(distanceMeters(0, 0, 0, 0)).toBe(0);
  });

  it('measures ~111 km per degree of latitude near equator', () => {
    const d = distanceMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it('Sydney to Melbourne is approximately 713 km', () => {
    const d = distanceMeters(-33.8688, 151.2093, -37.8136, 144.9631);
    expect(d).toBeGreaterThan(710_000);
    expect(d).toBeLessThan(716_000);
  });

  it('400 m separation is less than HOME_SUPPRESS_RADIUS_M', () => {
    // ~0.004 degrees latitude ≈ 444 m
    const d = distanceMeters(0, 0, 0.004, 0);
    expect(d).toBeLessThan(HOME_SUPPRESS_RADIUS_M);
  });

  it('600 m separation is greater than HOME_SUPPRESS_RADIUS_M', () => {
    // ~0.006 degrees latitude ≈ 667 m
    const d = distanceMeters(0, 0, 0.006, 0);
    expect(d).toBeGreaterThan(HOME_SUPPRESS_RADIUS_M);
  });

  it('is symmetric', () => {
    const d1 = distanceMeters(48.85, 2.35, 51.5, -0.12);
    const d2 = distanceMeters(51.5, -0.12, 48.85, 2.35);
    expect(Math.abs(d1 - d2)).toBeLessThan(1); // within 1 m
  });
});

describe('isAtHome', () => {
  const homeLat = -33.86;
  const homeLon = 151.21;

  it('returns false for static markers regardless of position', () => {
    expect(isAtHome({}, homeLat, homeLon, homeLat, homeLon)).toBe(false);
    expect(isAtHome({ latitude: homeLat, longitude: homeLon }, homeLat, homeLon, homeLat, homeLon)).toBe(false);
  });

  it('returns true for entity marker exactly at home', () => {
    expect(isAtHome({ entity: 'person.john' }, homeLat, homeLon, homeLat, homeLon)).toBe(true);
  });

  it('returns true for entity marker within default 500 m of home', () => {
    expect(isAtHome({ entity: 'person.john' }, homeLat + 0.003, homeLon, homeLat, homeLon)).toBe(true);
  });

  it('returns false for entity marker beyond default 500 m from home', () => {
    expect(isAtHome({ entity: 'person.john' }, homeLat + 0.009, homeLon, homeLat, homeLon)).toBe(false);
  });

  it('returns false for entity marker in a different city', () => {
    expect(isAtHome({ entity: 'device_tracker.van' }, -37.81, 144.96, homeLat, homeLon)).toBe(false);
  });

  it('respects a custom home_radius smaller than default', () => {
    // marker is ~333 m away — inside default 500 m but outside custom 200 m
    const marker = { entity: 'person.john', home_radius: 200 };
    expect(isAtHome(marker, homeLat + 0.003, homeLon, homeLat, homeLon)).toBe(false);
  });

  it('respects a custom home_radius larger than default', () => {
    // marker is ~667 m away — outside default 500 m but inside custom 1000 m
    const marker = { entity: 'person.john', home_radius: 1000 };
    expect(isAtHome(marker, homeLat + 0.006, homeLon, homeLat, homeLon)).toBe(true);
  });

  it('never suppresses when home_radius is 0 — even when HA state is home', () => {
    const hass = mockHass({ states: { 'person.john': entityStateHome(homeLat, homeLon) } });
    expect(isAtHome({ entity: 'person.john', home_radius: 0 }, homeLat, homeLon, homeLat, homeLon, hass)).toBe(false);
  });

  it('never suppresses zone entities — they are places, not people', () => {
    expect(isAtHome({ entity: 'zone.home' }, homeLat, homeLon, homeLat, homeLon)).toBe(false);
    expect(isAtHome({ entity: 'zone.work' }, homeLat + 0.001, homeLon, homeLat, homeLon)).toBe(false);
  });

  // ── HA state = 'home' (authoritative, beats GPS drift) ───────────────────

  it("returns true when entity state is 'home' even if GPS coordinates are far away", () => {
    // GPS says far away but HA says home — trust HA
    const hass = mockHass({ states: { 'person.john': entityStateHome(-37.81, 144.96) } });
    expect(isAtHome({ entity: 'person.john' }, -37.81, 144.96, homeLat, homeLon, hass)).toBe(true);
  });

  it("returns true when entity state is 'home' with GPS drift 1 km from HA home — the real bug", () => {
    // Without state check this wouldn't suppress (>500 m); with state check it does.
    const hass = mockHass({ states: { 'person.john': entityStateHome(homeLat + 0.009, homeLon) } });
    expect(isAtHome({ entity: 'person.john' }, homeLat + 0.009, homeLon, homeLat, homeLon, hass)).toBe(true);
  });

  it("returns false when entity state is 'not_home' and outside radius", () => {
    const hass = mockHass({ states: { 'person.john': { state: 'not_home', attributes: { latitude: homeLat + 0.009, longitude: homeLon } } } });
    expect(isAtHome({ entity: 'person.john' }, homeLat + 0.009, homeLon, homeLat, homeLon, hass)).toBe(false);
  });

  it('works correctly when hass is undefined (falls back to distance only)', () => {
    expect(isAtHome({ entity: 'person.john' }, homeLat, homeLon, homeLat, homeLon, undefined)).toBe(true);
    expect(isAtHome({ entity: 'person.john' }, homeLat + 0.009, homeLon, homeLat, homeLon, undefined)).toBe(false);
  });
});
