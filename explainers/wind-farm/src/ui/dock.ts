import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { SITE_WIND_IDS } from '../ids';
import type { WindFarmStoreState } from '../state';

const STREAMLINES_ICON =
  '<path d="M3 7c3-2 6 2 9 0s6-2 9 0" /><path d="M3 12c3-2 6 2 9 0s6-2 9 0" /><path d="M3 17c3-2 6 2 9 0s6-2 9 0" />';
const WAKES_ICON =
  '<path d="M5 4v16" /><path d="M5 9l15-4" /><path d="M5 15l15 4" /><path d="M10 12h9" />';
const CABLES_ICON =
  '<circle cx="5" cy="6" r="1.8" /><circle cx="19" cy="6" r="1.8" /><circle cx="12" cy="18" r="1.8" /><path d="M6.8 6h10.4M6 7.6l5 8.8M18 7.6l-5 8.8" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const WIND_FARM_CHOICES: readonly Choice<WindFarmStoreState>[] = [
  {
    id: 'siteWind',
    labelKey: 'controls.siteWind',
    shortcut: 'W',
    options: SITE_WIND_IDS.map((site) => ({
      value: site,
      labelKey: `controls.siteWindOptions.${site}`,
    })),
    select: (state) => state.siteWind,
    apply: (state, value) => state.setSiteWind(parseOption(value, SITE_WIND_IDS)),
  },
];

function viewToggle(view: string, shortcut: string, icon: string): ViewToggle {
  return {
    view,
    shortcut,
    nameKey: `controls.views.${view}.name`,
    shortKey: `controls.views.${view}.short`,
    hintKey: `controls.views.${view}.hint`,
    icon,
  };
}

export const VIEW_TOGGLES: readonly ViewToggle[] = [
  viewToggle('streamlines', 'F', STREAMLINES_ICON),
  viewToggle('wakes', 'K', WAKES_ICON),
  viewToggle('cables', 'C', CABLES_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
