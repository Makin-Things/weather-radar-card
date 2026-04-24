# Weather Radar Card — Backlog

## Multi-marker Support

Complete redesign of the marker system to support multiple markers, entity-based
positions, and automatic map tracking. This is a **breaking change** — the existing
single-marker config fields will be removed.

### Track resolution rules

Each marker can carry a `track` option. On every `hass` update the card evaluates
which marker (if any) should be used to auto-centre the map, using this priority
order:

1. **`track: entity` on a `person.*` entity** whose `user_id` matches the current
   logged-in HA user → highest priority. "I am this person, follow me."
2. **`track: entity` on a `device_tracker.*` entity** → second priority. The device
   is tracked for all viewers regardless of who is using it or logged in. Overridden
   only by a matching person in rule 1.
3. **`track: true`** → lowest always-on fallback. Any `track: entity` match from
   rules 1 or 2 overrides this.
4. Multiple markers at the **same priority level** → log a console warning and use
   the first one in the array.

### Proposed YAML format

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

- [ ] **Design marker config schema** — markers array; track: entity|true;
  resolution priority: (1) track:entity on person matching current user,
  (2) track:entity on device_tracker (viewer-independent), (3) track:true;
  multiple at same level = warn + first wins

- [ ] **Define new types** — `Marker` interface with `latitude?`, `longitude?`,
  `entity?`, `icon?`, `track?: 'entity' | true`; update `WeatherRadarCardConfig`
  replacing all single-marker fields with a `markers?` array

- [ ] **Implement multi-marker rendering** — replace single `_marker: L.Marker`
  with `_markers: L.Marker[]`; render all markers on map init and update positions
  on each `hass` update

- [ ] **Implement entity-based marker positions** — resolve `device_tracker.*`,
  `person.*`, `zone.*` entities to lat/lon on each `hass` update; handle missing
  or unavailable entities gracefully

- [ ] **Implement track resolution** — on each `hass` update: evaluate the priority
  stack above; re-centre the map to the winning marker's current position; warn to
  console on ties at the same priority level

- [ ] **Auto-migrate old config** — in `setConfig()`, if `markers` is absent but old
  single-marker fields (`marker_latitude`, `mobile_marker_latitude`, etc.) are
  present, synthesise a `markers` array in memory so old configs continue to work
  without touching the user's YAML. Log a deprecation warning. When `editMode` is
  active, optionally fire `config-changed` with the translated config so the editor
  writes the new format back automatically. Notes: collapse same-string lat/lon
  entity pairs to a single `entity` field; add `mobile_only: true` to any marker
  synthesised from mobile fields; do not migrate `center_latitude` / mobile center
  (those are map-centering fields, not markers).

- [ ] **Remove conflicting mobile support** — deprecate and remove
  `marker_latitude`, `marker_longitude`, `mobile_marker_latitude`,
  `mobile_marker_longitude`, `marker_icon`, `mobile_marker_icon`,
  `marker_icon_entity`, `mobile_marker_icon_entity`, `mobile_center_latitude`,
  `mobile_center_longitude`, `mobile_marker_latitude`, `mobile_marker_longitude`
  (breaking change — provide migration guide)

- [ ] **Update editor** — list-based markers section replacing the single-marker
  block; each row has entity/lat/lon pickers, icon selector, and a track selector
  (off / entity / always)

- [ ] **Update README and CHANGELOG** — document the new `markers` array format,
  track resolution rules, the complete list of removed config fields, and a
  migration guide for users upgrading from the old single-marker config

---

## Other Backlog Items

- Clickable / draggable timeline — already implemented ✅
- AM/PM vs 24 h time display — already implemented (browser locale) ✅
- Configurable double-tap action — already implemented ✅
- Hide progress bar option — already implemented ✅
- Hide / show colour bar option — already implemented ✅
- Dynamic map style (Auto) — already implemented ✅
