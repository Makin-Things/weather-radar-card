/* eslint-disable @typescript-eslint/no-explicit-any */
import { HomeAssistant } from 'custom-card-helpers';
import { WeatherRadarCardConfig } from './types';
import { localize } from './localize/localize';

// Returns banner messages for any enabled overlay/data-source whose coverage
// region doesn't include the user's HA-configured country. Empty array means
// no warnings to display. Caller renders the messages in the status-banner
// stack above the map.
//
// Detection is intentionally coarse — we trust hass.config.country (an ISO
// 3166-1 alpha-2 code) and don't try to handle territories or coastal/marine
// edge cases. False positives (e.g. a user in PR seeing the US-only message)
// are preferable to false negatives that would silently fail to load data.
//
// TODO: once PR #114 (DWD) merges, add a warning when data_source === 'DWD'
// and country isn't DE or an immediate neighbour (NL, BE, FR, CH, AT, CZ, PL).
// See nws-alerts-feature-design.md / wildfire-feature-design.md for context.
export function getRegionWarnings(
  hass: HomeAssistant | undefined,
  cfg: WeatherRadarCardConfig,
): string[] {
  // custom-card-helpers' HassConfig type omits `country` even though HA
  // populates it at runtime — cast to any to read it without typings churn.
  const country = (hass?.config as any)?.country as string | undefined;
  if (!country) return [];   // unknown — assume the user knows what they're doing

  const messages: string[] = [];

  const wildfiresEnabled = cfg.show_wildfires === true;
  const noaaSelected = (cfg.data_source ?? '').toUpperCase() === 'NOAA';

  if (country !== 'US') {
    if (wildfiresEnabled && noaaSelected) {
      // Combined message — avoid stacking two near-identical banners.
      messages.push(localize('ui.region_warning.us_combined'));
    } else if (wildfiresEnabled) {
      messages.push(localize('ui.region_warning.wildfires_us_only'));
    } else if (noaaSelected) {
      messages.push(localize('ui.region_warning.noaa_us_only'));
    }
  }

  return messages;
}
