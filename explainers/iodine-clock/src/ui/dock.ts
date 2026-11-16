import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { SCALE_IDS } from '../ids';
import type { ClockStoreState } from '../state';

const WATER_ICON =
  '<path d="M12 3.5c3.2 4 5.5 7.2 5.5 10a5.5 5.5 0 0 1-11 0c0-2.8 2.3-6 5.5-10Z" /><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export function applyScale(state: ClockStoreState, value: string): void {
  state.setScale(parseOption(value, SCALE_IDS));
}

export const CLOCK_CHOICES: readonly Choice<ClockStoreState>[] = [
  {
    id: 'scale',
    labelKey: 'controls.scale',
    shortcut: 'M',
    options: SCALE_IDS.map((id) => ({ value: id, labelKey: `controls.scaleOptions.${id}` })),
    select: (state) => state.scale,
    apply: applyScale,
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
  viewToggle('water', 'W', WATER_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
