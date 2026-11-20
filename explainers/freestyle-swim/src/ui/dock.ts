import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { PACE_IDS } from '../ids';
import type { SwimStoreState } from '../state';

const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';
const FORCES_ICON = '<path d="M4 12h13" /><path d="M12.5 7l5 5-5 5" /><path d="M4 6.5v11" />';
const UNDERWATER_ICON =
  '<path d="M3 8c2.2-2 4.2-2 6 0s3.8 2 6 0 3.3-1.5 6 0" /><path d="M3 14c2.2-2 4.2-2 6 0s3.8 2 6 0 3.3-1.5 6 0" />';
const HAND_PATH_ICON =
  '<path d="M4 7c5 0 5 10 9 10 3 0 4-3 7-3" /><circle cx="4.5" cy="7" r="1.5" /><circle cx="19.5" cy="14" r="1.5" />';

export function applyPace(state: SwimStoreState, value: string): void {
  state.setPace(parseOption(value, PACE_IDS));
}

export const PACE_CHOICES: readonly Choice<SwimStoreState>[] = [
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
  viewToggle('underwater', 'U', UNDERWATER_ICON),
  viewToggle('handPath', 'H', HAND_PATH_ICON),
];
