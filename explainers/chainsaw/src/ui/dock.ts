import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { THROTTLE_CHOICE_IDS } from '../ids';
import type { ThrottleChoiceId } from '../ids';
import { THROTTLE_PRESETS } from '../model';
import type { ChainsawStoreState } from '../state';

const CUTAWAY_ICON =
  '<rect x="4" y="4" width="16" height="16" rx="3" /><path class="icon-fill" d="M12 4h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5Z" />';
const FLOW_ICON =
  '<circle cx="5.5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><path d="M16 12h5" /><path d="m18.5 9 2.5 3-2.5 3" />';
const ZONE_ICON =
  '<path d="M3 15h11a5 5 0 0 0 0-10H3" /><path d="M14 5a5 5 0 0 1 5 5" /><path d="M19 10h-5V5" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

const NO_CHOICE = '';

export function throttleChoiceOf(throttle: number): ThrottleChoiceId | typeof NO_CHOICE {
  return THROTTLE_CHOICE_IDS.find((id) => THROTTLE_PRESETS[id] === throttle) ?? NO_CHOICE;
}

export function applyThrottleChoice(state: ChainsawStoreState, value: string): void {
  state.setThrottle(THROTTLE_PRESETS[parseOption(value, THROTTLE_CHOICE_IDS)]);
}

export const CHAINSAW_CHOICES: readonly Choice<ChainsawStoreState>[] = [
  {
    id: 'throttle',
    labelKey: 'controls.throttle',
    shortcut: 'T',
    options: THROTTLE_CHOICE_IDS.map((id) => ({
      value: id,
      labelKey: `controls.throttleOptions.${id}`,
    })),
    select: (state) => throttleChoiceOf(state.throttle),
    apply: applyThrottleChoice,
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
  viewToggle('flow', 'F', FLOW_ICON),
  viewToggle('zone', 'K', ZONE_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
