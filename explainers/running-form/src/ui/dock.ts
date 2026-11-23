import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { PACE_IDS } from '../ids';
import type { RunStoreState } from '../state';

const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';
const FORCES_ICON = '<path d="M12 21V7" /><path d="M7 12l5-5 5 5" /><path d="M5 21h14" />';
const FORM_LINES_ICON =
  '<path d="M7 21 14 3" /><path d="M7 21v-6" /><path d="M7 16a5 5 0 0 1 1.2-3.2" />';
const FOOT_PATH_ICON =
  '<path d="M4 15c0-5 5-9 10-9 4 0 6 2.5 6 5.5 0 3.5-4 5-8 5-4.5 0-8-.5-8-1.5Z" /><circle cx="17.5" cy="8" r="1.5" />';
const FOLLOW_ICON = '<circle cx="12" cy="12" r="4" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" />';

export function applyPace(state: RunStoreState, value: string): void {
  state.setPace(parseOption(value, PACE_IDS));
}

export const PACE_CHOICES: readonly Choice<RunStoreState>[] = [
  {
    id: 'pace',
    labelKey: 'controls.pace',
    shortcut: 'P',
    options: PACE_IDS.map((id) => ({ value: id, labelKey: `controls.paceOptions.${id}` })),
    select: (state) => state.pace,
    apply: applyPace,
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
  viewToggle('labels', 'L', LABELS_ICON),
  viewToggle('forces', 'F', FORCES_ICON),
  viewToggle('formLines', 'G', FORM_LINES_ICON),
  viewToggle('footPath', 'H', FOOT_PATH_ICON),
  viewToggle('follow', 'O', FOLLOW_ICON),
];
