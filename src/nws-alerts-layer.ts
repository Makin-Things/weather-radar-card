/* eslint-disable @typescript-eslint/no-explicit-any */
import * as L from 'leaflet';
import { HomeAssistant } from 'custom-card-helpers';
import { WeatherRadarCardConfig } from './types';
import { localize } from './localize/localize';
import { colorForEvent, NWS_ALERT_DEFAULT_COLOR } from './nws-alert-colors';
import {
  AlertCategory, ALL_ALERT_CATEGORIES, DEFAULT_ALERT_CATEGORIES, categoryForEvent,
} from './nws-alert-categories';

// NWS public API — see nws-alerts-feature-design.md.
const NWS_ALERTS_URL = 'https://api.weather.gov/alerts/active?status=actual';
// NWS asks all callers to identify themselves with a User-Agent. Browsers
// override this header from JS, so the request will actually carry the
// browser's UA — but setting it explicitly does no harm and matches the
// recommended convention. (The fetch is allowed regardless.)
const USER_AGENT = 'weather-radar-card (https://github.com/Makin-Things/weather-radar-card)';

const DEFAULT_REFRESH_VISIBLE_MS = 60 * 1000;
const DEFAULT_REFRESH_EMPTY_MS = 5 * 60 * 1000;
const DEFAULT_FILL_OPACITY = 0.25;
const DEFAULT_MIN_SEVERITY: Severity = 'Minor';

type Severity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
const SEVERITY_RANK: Record<Severity, number> = {
  Unknown: 0, Minor: 1, Moderate: 2, Severe: 3, Extreme: 4,
};

interface AlertProps {
  id?: string;
  event?: string;
  severity?: Severity;
  certainty?: string;
  urgency?: string;
  effective?: string;
  expires?: string;
  ends?: string;
  headline?: string;
  description?: string;
  areaDesc?: string;
  uri?: string | null;
  affectedZones?: string[];
  senderName?: string;
}

export class NwsAlertsLayer {
  private _map: L.Map;
  private _getConfig: () => WeatherRadarCardConfig;
  private _hass: HomeAssistant | undefined;

  private _polygonLayer: L.GeoJSON | null = null;
  // All polygon-bearing features kept after filtering. Zone-only alerts
  // (geometry === null) are skipped in Phase 1 — see TODO in _filter().
  private _features: GeoJSON.Feature[] = [];
  // Per-feature render decision keyed by feature.id (NWS-provided URL).
  // Compared on each _render() call; if unchanged, we skip the rebuild,
  // preserving any open popup. See "Lessons from the wildfire build" in the
  // alerts design doc — same trap that closed wildfire popups every hass tick.
  private _renderDecisions: Map<string, string> = new Map();
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _gen = 0;

  constructor(
    map: L.Map,
    getConfig: () => WeatherRadarCardConfig,
    hass?: HomeAssistant,
  ) {
    this._map = map;
    this._getConfig = getConfig;
    this._hass = hass;
  }

  start(): void {
    void this._fetch();
  }

  clear(): void {
    this._gen++;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this._polygonLayer) { this._map.removeLayer(this._polygonLayer); this._polygonLayer = null; }
    this._features = [];
    this._renderDecisions.clear();
  }

  // hass changes don't affect the polygon-vs-polygon decisions (no zoom-
  // dependent rendering for alerts). Re-render with the skip-if-unchanged
  // guard so a no-op tick is truly a no-op and any open popup stays open.
  // The radius_km filter does depend on map centre, but the centre changes
  // via map move events, not hass — and map moves don't trigger this method.
  updateHass(hass: HomeAssistant): void {
    this._hass = hass;
    if (this._features.length === 0) return;
    this._render({ skipIfDecisionsUnchanged: true });
  }

  private async _fetch(): Promise<void> {
    const myGen = ++this._gen;
    let features: GeoJSON.Feature[] = [];
    try {
      const res = await fetch(NWS_ALERTS_URL, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' } });
      if (!res.ok) throw new Error(`NWS fetch ${res.status}`);
      const data = await res.json() as GeoJSON.FeatureCollection;
      features = data?.features ?? [];
    } catch (err) {
      // Transient: NWS occasionally returns 5xx during outages. Retry on
      // the next scheduled interval; don't blow away currently-displayed
      // alerts (this._features is left intact below if features stays []).
      console.warn('NWS alerts: fetch failed', err);
      this._scheduleNext();
      return;
    }
    if (myGen !== this._gen) return;   // stale

    this._features = this._filter(features);
    this._render();
    this._scheduleNext();
  }

  private _filter(all: GeoJSON.Feature[]): GeoJSON.Feature[] {
    const cfg = this._getConfig();
    const minSev = (cfg.alerts_min_severity ?? DEFAULT_MIN_SEVERITY) as Severity;
    const minRank = SEVERITY_RANK[minSev] ?? SEVERITY_RANK.Minor;
    const radiusKm = cfg.alerts_radius_km;
    const centre = radiusKm ? this._map.getCenter() : null;

    // Resolve the active type allowlist. Explicit alerts_types overrides
    // alerts_categories. Otherwise convert categories → set of allowed
    // event strings via the EVENT_TO_CATEGORY map (lazily built on demand
    // so the user can also use a category they've never seen before).
    const explicitTypes = cfg.alerts_types && cfg.alerts_types.length > 0
      ? new Set(cfg.alerts_types) : null;
    const activeCategories = new Set<AlertCategory>(
      (cfg.alerts_categories && cfg.alerts_categories.length > 0
        ? cfg.alerts_categories
        : DEFAULT_ALERT_CATEGORIES) as AlertCategory[],
    );

    return all.filter((f) => {
      // Phase 1: skip zone-only alerts (no geometry). Phase 2 will resolve
      // affectedZones URLs into geometry from /zones/{type}/{id}.
      // TODO(phase 2): _resolveZones() to fill these in.
      if (!f.geometry) return false;

      const props = f.properties as AlertProps | null;

      // Severity floor
      const sev = (props?.severity ?? 'Unknown') as Severity;
      if ((SEVERITY_RANK[sev] ?? 0) < minRank) return false;

      // Type / category allowlist
      const event = props?.event;
      if (explicitTypes) {
        if (!event || !explicitTypes.has(event)) return false;
      } else {
        if (!activeCategories.has(categoryForEvent(event))) return false;
      }

      // Radius from map centre
      if (radiusKm && centre) {
        const c = centroidLngLat(f.geometry);
        if (!c) return false;
        const distKm = haversineKm(centre.lat, centre.lng, c[1], c[0]);
        if (distKm > radiusKm) return false;
      }

      return true;
    });
  }

  private _render(opts?: { skipIfDecisionsUnchanged?: boolean }): void {
    try {
      this._renderInner(opts);
    } catch (err) {
      // Catch-all so a render exception can never escape into the host
      // card's Lit lifecycle. Same protection the wildfire layer carries.
      console.warn('NWS alerts: render failed', err);
    }
  }

  private _renderInner(opts?: { skipIfDecisionsUnchanged?: boolean }): void {
    if (!this._map) return;
    const cfg = this._getConfig();
    const fillOpacity = cfg.alerts_fill_opacity ?? DEFAULT_FILL_OPACITY;

    // Sort severity-ascending so more-severe features render on top
    // (Leaflet draws later features above earlier ones in the same layer).
    const sorted = [...this._features].sort((a, b) => {
      const sa = SEVERITY_RANK[((a.properties as AlertProps)?.severity ?? 'Unknown') as Severity] ?? 0;
      const sb = SEVERITY_RANK[((b.properties as AlertProps)?.severity ?? 'Unknown') as Severity] ?? 0;
      return sa - sb;
    });

    // Compute per-feature decisions BEFORE tearing down — so we can short
    // circuit when nothing meaningful changed.
    const newDecisions = new Map<string, string>();
    for (const f of sorted) {
      const key = featureKey(f);
      const props = f.properties as AlertProps | null;
      // The "decision" is everything that affects how this feature is
      // drawn: event (-> colour) and severity (-> z-order). If both match
      // the previous render, the layer renders identically — skip rebuild.
      newDecisions.set(key, `${props?.event ?? ''}|${props?.severity ?? ''}`);
    }

    if (opts?.skipIfDecisionsUnchanged && decisionsEqual(this._renderDecisions, newDecisions)) {
      return;
    }
    this._renderDecisions = newDecisions;

    if (this._polygonLayer) {
      this._map.removeLayer(this._polygonLayer);
      this._polygonLayer = null;
    }

    if (sorted.length === 0) return;

    this._polygonLayer = L.geoJSON(sorted, {
      style: (feature) => {
        const event = (feature?.properties as AlertProps | null)?.event;
        const colour = colorForEvent(event);
        return { color: colour, weight: 1.5, fillColor: colour, fillOpacity };
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(
          buildPopupHtml(feature.properties as AlertProps | null),
          { autoPan: false },
        );
      },
    });
    this._polygonLayer.addTo(this._map);
  }

  private _scheduleNext(): void {
    if (this._timer) clearTimeout(this._timer);
    const cfg = this._getConfig();
    const overrideSec = cfg.alerts_refresh_seconds;
    const intervalMs = overrideSec
      ? overrideSec * 1000
      : (this._features.length > 0 ? DEFAULT_REFRESH_VISIBLE_MS : DEFAULT_REFRESH_EMPTY_MS);
    this._timer = setTimeout(() => void this._fetch(), intervalMs);
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

function featureKey(f: GeoJSON.Feature): string {
  // NWS gives every alert a unique URL as feature.id. Always present in
  // practice; fall back to properties.id (a urn:oid:...) just in case.
  if (f.id != null) return String(f.id);
  const p = f.properties as AlertProps | null;
  return p?.id ?? '';
}

function decisionsEqual(a: Map<string, string>, b: Map<string, string>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

function buildPopupHtml(props: AlertProps | null): string {
  const event = props?.event ?? localize('ui.alerts.unknown_event');
  const severity = props?.severity ?? '—';
  const certainty = props?.certainty ?? '—';
  const urgency = props?.urgency ?? '—';
  const effective = formatDateTime(props?.effective);
  const expires = formatDateTime(props?.expires ?? props?.ends);
  const headline = props?.headline ?? '';
  const area = props?.areaDesc ?? '';
  const colour = colorForEvent(props?.event);
  const accent = colour === '#FFFFFF' || colour === '#FFE4B5' || colour === '#FFFF00'
    ? '#444' : colour;   // unreadable on light fills — fall back to dark text

  // properties.uri is sometimes null in practice; fall back to the alerts
  // index page so the link always works (even if it's not as deep).
  const linkUrl = props?.uri && /^https?:\/\//.test(props.uri)
    ? props.uri
    : 'https://www.weather.gov/alerts';

  return `
    <div style="font:12px/1.4 'Helvetica Neue',Arial,sans-serif;min-width:220px;max-width:320px">
      <div style="font-weight:bold;font-size:13px;margin-bottom:4px;color:${accent}">${escapeHtml(event)}</div>
      ${headline ? `<div style="margin-bottom:6px">${escapeHtml(truncate(headline, 200))}</div>` : ''}
      <div><b>${escapeHtml(localize('ui.alerts.severity'))}:</b> ${escapeHtml(severity)} · <b>${escapeHtml(localize('ui.alerts.certainty'))}:</b> ${escapeHtml(certainty)} · <b>${escapeHtml(localize('ui.alerts.urgency'))}:</b> ${escapeHtml(urgency)}</div>
      <div><b>${escapeHtml(localize('ui.alerts.effective'))}:</b> ${escapeHtml(effective)}</div>
      <div><b>${escapeHtml(localize('ui.alerts.expires'))}:</b> ${escapeHtml(expires)}</div>
      ${area ? `<div style="margin-top:4px"><b>${escapeHtml(localize('ui.alerts.area'))}:</b> ${escapeHtml(truncate(area, 200))}</div>` : ''}
      <div style="margin-top:6px;font-size:10px;color:#a00;font-weight:bold">${escapeHtml(localize('ui.alerts.disclaimer'))}</div>
      <div style="margin-top:4px"><a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(localize('ui.alerts.more_info'))}</a></div>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function formatDateTime(s: string | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function geometryLngLatBounds(
  geom: GeoJSON.Geometry,
): { minLng: number; minLat: number; maxLng: number; maxLat: number } | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  let any = false;
  const visit = (ring: GeoJSON.Position[]) => {
    for (const p of ring) {
      const [lng, lat] = p;
      if (typeof lng !== 'number' || typeof lat !== 'number') continue;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
      any = true;
    }
  };
  if (geom.type === 'Polygon') {
    for (const r of geom.coordinates) visit(r);
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) for (const r of poly) visit(r);
  } else {
    return null;
  }
  return any ? { minLng, minLat, maxLng, maxLat } : null;
}

function centroidLngLat(geom: GeoJSON.Geometry): [number, number] | null {
  const b = geometryLngLatBounds(geom);
  if (!b) return null;
  return [(b.minLng + b.maxLng) / 2, (b.minLat + b.maxLat) / 2];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
    * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Re-export for the editor to enumerate available categories without
// importing the categories module directly.
export { ALL_ALERT_CATEGORIES, NWS_ALERT_DEFAULT_COLOR };
