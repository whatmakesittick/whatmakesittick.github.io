import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { TOP_SPEED_IDS } from '../ids';
import type { DockViewId } from '../ids';
import type { MaglevTrainStoreState } from '../state';

const WAVE_ICON =
  '<path d="M2 10c2.2-5 4.3-5 6.5 0s4.3 5 6.5 0 4.3-5 6.5 0" /><path d="M7 19.5h10" /><path d="m14.5 17 2.5 2.5-2.5 2.5" />';
const GAP_ICON =
  '<rect x="3" y="3.5" width="18" height="5" rx="1" /><rect class="icon-fill" x="3" y="15.5" width="18" height="5" rx="1" /><path d="M12 10v4" /><path d="m10 11.5 2-1.5 2 1.5" /><path d="m10 12.5 2 1.5 2-1.5" />';
const GHOST_ICON =
  '<path d="M2 16h15.5a3.5 3.5 0 0 0 1.2-6.8L14 7.5H2" stroke-dasharray="2.5 2.5" /><path d="M2 20h20" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export function applyTopSpeedChoice(state: MaglevTrainStoreState, value: string): void {
  state.setTopSpeed(parseOption(value, TOP_SPEED_IDS));
}

export const MAGLEV_TRAIN_CHOICES: readonly Choice<MaglevTrainStoreState>[] = [
  {
    id: 'topSpeed',
    labelKey: 'controls.topSpeed',
    shortcut: 'T',
    options: TOP_SPEED_IDS.map((id) => ({ value: id, labelKey: `controls.topSpeedOptions.${id}` })),
    select: (state) => state.topSpeed,
    apply: applyTopSpeedChoice,
  },
];

function viewToggle(view: DockViewId, shortcut: string, icon: string): ViewToggle {
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
  viewToggle('wave', 'W', WAVE_ICON),
  viewToggle('gap', 'G', GAP_ICON),
  viewToggle('ghost', 'H', GHOST_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
