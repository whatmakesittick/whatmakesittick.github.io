import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { PEDAL_IDS, TOUCH_IDS } from '../ids';
import type { DockViewId } from '../ids';
import type { PianoStoreState } from '../state';

const SOUND_ICON =
  '<path d="M3.5 9.5h3.5l5-4.5v14l-5-4.5H3.5Z" /><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18.5 6a8 8 0 0 1 0 12" />';
const WAVE_ICON =
  '<path d="M2 12h3" /><path d="M19 12h3" /><path d="M5 12c1.2-6 2.3-6 3.5 0s2.3 6 3.5 0 2.3-6 3.5 0 2.3 6 3.5 0" />';
const INSET_ICON =
  '<rect x="3" y="3" width="11" height="9" rx="1" /><circle class="icon-fill" cx="8.5" cy="7.5" r="2" /><path d="M14 12l4.5 4.5" /><circle cx="19" cy="17" r="2.5" />';
const GHOST_ICON =
  '<path d="M6 21V8.5L12 3l6 5.5V21" stroke-dasharray="2.5 2.5" /><path d="M3 21h18" />';
const FOLLOW_ICON =
  '<circle cx="12" cy="12" r="6.5" /><circle class="icon-fill" cx="12" cy="12" r="2" /><path d="M12 2v3.5" /><path d="M12 18.5V22" /><path d="M2 12h3.5" /><path d="M18.5 12H22" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export function applyTouchChoice(state: PianoStoreState, value: string): void {
  state.setTouch(parseOption(value, TOUCH_IDS));
}

export function applyPedalChoice(state: PianoStoreState, value: string): void {
  state.setPedal(parseOption(value, PEDAL_IDS));
}

export const PIANO_CHOICES: readonly Choice<PianoStoreState>[] = [
  {
    id: 'touch',
    labelKey: 'controls.touch',
    shortcut: 'T',
    options: TOUCH_IDS.map((id) => ({ value: id, labelKey: `controls.touchOptions.${id}` })),
    select: (state) => state.touch,
    apply: applyTouchChoice,
  },
  {
    id: 'pedal',
    labelKey: 'controls.pedal',
    shortcut: 'P',
    options: PEDAL_IDS.map((id) => ({ value: id, labelKey: `controls.pedalOptions.${id}` })),
    select: (state) => state.pedal,
    apply: applyPedalChoice,
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
  viewToggle('sound', 'S', SOUND_ICON),
  viewToggle('wave', 'W', WAVE_ICON),
  viewToggle('inset', 'I', INSET_ICON),
  viewToggle('ghost', 'G', GHOST_ICON),
  viewToggle('follow', 'F', FOLLOW_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
