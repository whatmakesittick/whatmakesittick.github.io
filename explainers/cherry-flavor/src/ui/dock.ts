import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { SCALE_IDS } from '../ids';
import type { FlavorStoreState } from '../state';

const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';
const PINCH_ICON =
  '<path d="M12 3.5c-1 3.5-3.5 7-3.5 11a3.5 3.5 0 0 0 7 0c0-4-2.5-7.5-3.5-11Z" /><path d="M5 15.5h4M15 15.5h4" /><path d="M5 13.5v4M19 13.5v4" />';

export function applyScale(state: FlavorStoreState, value: string): void {
  state.setScale(parseOption(value, SCALE_IDS));
}

export const SCALE_CHOICES: readonly Choice<FlavorStoreState>[] = [
  {
    id: 'scale',
    labelKey: 'controls.scale',
    shortcut: 'V',
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
  viewToggle('labels', 'L', LABELS_ICON),
  viewToggle('pinched', 'N', PINCH_ICON),
];
