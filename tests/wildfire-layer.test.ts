// Tests for wildfire-layer.ts's buildPopupHtml — specifically the area
// unit conversion (acres -> hectares for metric users, issue follow-up
// to #239) and the discovery-date locale handling. Leaflet is mocked
// purely to satisfy the module's import graph; buildPopupHtml itself is
// a pure string builder that never touches L.* APIs.

import { describe, it, expect, vi } from 'vitest';

vi.mock('leaflet', () => {
  class Layer {}
  class TileLayer {}
  class WMS {}
  (TileLayer as unknown as { WMS: typeof WMS }).WMS = WMS;
  class Control {
    constructor(_opts?: unknown) { void _opts; }
  }
  const DomUtil = { create: vi.fn(() => ({ style: {}, classList: { add: vi.fn() } })) };
  const DomEvent = { disableClickPropagation: vi.fn(), on: vi.fn() };
  return {
    Layer, TileLayer, Control, DomUtil, DomEvent,
    default: { Layer, TileLayer, Control, DomUtil, DomEvent },
  };
});

import { buildPopupHtml } from '../src/wildfire-layer';

/* eslint-disable @typescript-eslint/no-explicit-any */

const baseProps = (over: Record<string, unknown> = {}): any => ({
  poly_IncidentName: 'Sand Drain',
  poly_GISAcres: 1000,
  attr_PercentContained: 50,
  attr_FireDiscoveryDateTime: new Date('2026-08-15T12:00:00Z').getTime(),
  attr_POOJurisdictionalUnit: null,
  ...over,
});

describe('buildPopupHtml — area (acres/hectares)', () => {
  it('without hass, defaults to metric (hectares) — same fallback convention as formatDistance', () => {
    // 1000 acres x 0.404686 = 404.686 -> 405
    const html = buildPopupHtml(baseProps(), new Set(), true, undefined);
    expect(html).toContain('405 ha');
    expect(html).toContain('Area');
  });

  it('with an imperial (mi) unit system, shows acres', () => {
    const hass = { config: { unit_system: { length: 'mi' } } } as any;
    const html = buildPopupHtml(baseProps(), new Set(), true, hass);
    expect(html).toContain('1,000 ac');
  });

  it('with a metric (km) unit system, converts to hectares', () => {
    // 1000 acres x 0.404686 = 404.686 -> 405
    const hass = { config: { unit_system: { length: 'km' } } } as any;
    const html = buildPopupHtml(baseProps(), new Set(), true, hass);
    expect(html).toContain('405 ha');
    expect(html).not.toContain('1,000 ac');
  });

  it('shows the em-dash placeholder when acreage is missing', () => {
    const html = buildPopupHtml(baseProps({ poly_GISAcres: undefined }), new Set(), true, undefined);
    expect(html).toMatch(/Area:<\/b>\s*—/);
  });
});

describe('buildPopupHtml — discovery date locale handling', () => {
  it('without hass, formats via Date#toLocaleDateString (browser-locale fallback)', () => {
    const html = buildPopupHtml(baseProps(), new Set(), true, undefined);
    expect(html).toMatch(/2026/);
  });

  it('with hass.locale, formats via HA\'s own formatDate (still contains the year)', () => {
    const hass = { locale: { language: 'en', number_format: 'language', time_format: '24' } } as any;
    const html = buildPopupHtml(baseProps(), new Set(), true, hass);
    expect(html).toMatch(/2026/);
  });

  it('shows the em-dash placeholder when discovery date is missing', () => {
    const html = buildPopupHtml(baseProps({ attr_FireDiscoveryDateTime: undefined }), new Set(), true, undefined);
    expect(html).toMatch(/Discovered:<\/b>\s*—/);
  });
});
