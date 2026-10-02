import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { LOAD_IDS } from '../ids';
import type { ReaperStoreState } from '../state';

const CUTAWAY_ICON = '<path d="M9 3.5h6v4l3.5 12.5h-13L9 7.5Z" /><path d="M12 3.5V20" />';
const LINKS_ICON =
  '<path d="M5 19 12 12" /><circle cx="12" cy="12" r="1.6" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />';
const TRACK_ICON =
  '<path d="M4 18c3-1 4-5 7-6s5 1 7-1 1-5 2-6" stroke-dasharray="2.5 2.5" /><circle cx="4" cy="18" r="1.6" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const REAPER_CHOICES: readonly Choice<ReaperStoreState>[] = [
  {
    id: 'load',
    labelKey: 'controls.load.label',
    shortcut: 'W',
    options: LOAD_IDS.map((load) => ({ value: load, labelKey: `controls.loadOptions.${load}` })),
    select: (state) => state.load,
    apply: (state, value) => state.setLoad(parseOption(value, LOAD_IDS)),
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
  viewToggle('links', 'K', LINKS_ICON),
  viewToggle('track', 'T', TRACK_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
