import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { FIT_IDS } from '../ids';
import type { NavalDroneStoreState } from '../state';

const CUTAWAY_ICON =
  '<path d="M3 10.5h18l-2.6 6.5H5.6Z" /><path d="M12 10.5V17" /><path d="M7.5 10.5V7.5h6v3" />';
const FLOW_ICON =
  '<path d="M3 4.5h18M3 19.5h18" /><path d="M4 8c2-1.2 4 1.2 6 0s4-1.2 6 0h3" /><path d="m17.5 6.6 1.9 1.4-1.9 1.4" /><path d="M4 12c2-1.2 4 1.2 6 0s4-1.2 6 0h3" /><path d="m17.5 10.6 1.9 1.4-1.9 1.4" /><path d="M4 16c2-1.2 4 1.2 6 0s4-1.2 6 0h3" /><path d="m17.5 14.6 1.9 1.4-1.9 1.4" />';
const LINKS_ICON =
  '<path d="M5 19 12 12" /><circle cx="12" cy="12" r="1.6" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const NAVAL_DRONE_CHOICES: readonly Choice<NavalDroneStoreState>[] = [
  {
    id: 'fit',
    labelKey: 'controls.fit.label',
    shortcut: 'F',
    options: FIT_IDS.map((fit) => ({ value: fit, labelKey: `controls.fitOptions.${fit}` })),
    select: (state) => state.fit,
    apply: (state, value) => state.setFit(parseOption(value, FIT_IDS)),
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
  viewToggle('cutaway', 'C', CUTAWAY_ICON),
  viewToggle('flow', 'W', FLOW_ICON),
  viewToggle('links', 'K', LINKS_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
