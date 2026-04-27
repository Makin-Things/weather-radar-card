# Weather Radar Card — Backlog

Backlog of design notes for shipped and proposed work. Items marked ✅ are
released; remaining unchecked items are open ideas.

## Multi-marker Support ✅ — shipped in 3.1.0

Complete redesign of the marker system supporting multiple markers, entity-based
positions, and automatic map tracking. **Breaking change** — single-marker
config fields are deprecated and auto-migrated in memory on load.

### Track resolution rules

Each marker can carry a `track` option. On every `hass` update the card evaluates
which marker (if any) should be used to auto-centre the map, using this priority
order:

1. **`track: entity` on a `person.*` entity** whose `user_id` matches the current
   logged-in HA user → highest priority. "I am this person, follow me."
2. **`track: entity` on any other entity** (e.g. `device_tracker.*`) → second
   priority. The device is tracked for all viewers regardless of who is using it
   or logged in. Overridden only by a matching person in rule 1.
3. **`track: true`** → lowest always-on fallback. Any `track: entity` match from
   rules 1 or 2 overrides this.
4. Multiple markers at the **same priority level** → log a console warning and
   use the first one in the array.

### YAML format

```yaml
markers:
  - entity: person.john          # centres only when john is the logged-in user
    icon: entity_picture
    track: entity

  - entity: device_tracker.van   # always centres on the van for all viewers
    icon: mdi:car                #   overridden for john by the person rule above
    track: entity

  - entity: device_tracker.bike  # lowest-priority always-on fallback
    icon: mdi:bicycle
    track: true

  - latitude: -33.86             # static marker, no tracking
    longitude: 151.21
    icon: mdi:home
```

### Tasks

- [x] Marker config schema — `markers[]` array; `track: entity | true`;
  resolution priority described above
- [x] `Marker` interface (`latitude?`, `longitude?`, `entity?`, `icon?`,
  `icon_entity?`, `color?`, `track?`, `mobile_only?`); legacy fields kept on
  `WeatherRadarCardConfig` for migration only
- [x] Multi-marker rendering with live position updates on every hass change
- [x] Entity-based marker positions (`device_tracker.*`, `person.*`, `zone.*`,
  any entity with `latitude`/`longitude` attributes)
- [x] Track resolution with priority + tie-warning
- [x] Auto-migration in `setConfig()` — synthesises a `markers[]` from the old
  fields in memory; deprecation warning logged; same-string lat/lon entity pairs
  collapsed to a single `entity` field; `mobile_only: true` added to mobile
  variants
- [x] Default `zone.home` marker when `markers` is absent; `markers: []` opts out
- [x] Editor — list-based markers section; per-row entity / lat-lon / icon /
  track / colour / mobile-only controls; HA `ha-icon-picker` for icon
  autocomplete; auto-detect icon from selected entity
- [x] Marker clustering with spiderfy and home-cluster badge representation
- [x] README and CHANGELOG updates

---

## Scroll / Swipe Passthrough ✅ — shipped in 3.0.1

`disable_scroll` config option suppresses single-finger pan / mouse drag while
preserving pinch-to-zoom, so mobile users can scroll past the card.

### Tasks

- [x] `disable_scroll` config option (boolean, default `false`)
- [x] Disable Leaflet `dragging` on map init when option is on
- [x] Editor toggle in the Interaction section
- [x] README and CHANGELOG updates

---

## Other Backlog Items

All historically tracked items are now shipped:

- Clickable / draggable timeline ✅
- AM / PM vs 24 h time display (browser locale) ✅
- Configurable double-tap action ✅
- Hide progress bar option ✅
- Hide / show colour bar option ✅
- Dynamic map style (Auto) ✅
- Marker clustering ✅
- Multi-marker support ✅
