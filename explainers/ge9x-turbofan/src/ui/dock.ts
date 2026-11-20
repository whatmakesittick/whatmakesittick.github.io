import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { CUTAWAY_IDS, STREAM_IDS } from '../ids';
import { LEVER_NUDGE } from '../state';
import type { EngineStoreState } from '../state';

const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';
const PERSON_ICON =
  '<circle cx="12" cy="5" r="2.2" /><path d="M12 8v7M8 10.5h8M12 15l-3 6M12 15l3 6" />';
const REVERSER_ICON =
  '<path d="M3 8h9a5 5 0 0 1 5 5v1" /><path d="M14 17l3 3 3-3" /><path d="M3 8l3-3M3 8l3 3" />';

export function applyCutaway(state: EngineStoreState, value: string): void {
  state.setCutaway(parseOption(value, CUTAWAY_IDS));
}

export function applyStreams(state: EngineStoreState, value: string): void {
  state.setStreams(parseOption(value, STREAM_IDS));
}

export const ENGINE_CHOICES: readonly Choice<EngineStoreState>[] = [
  {
    id: 'cutaway',
    labelKey: 'controls.cutaway',
    shortcut: 'C',
    options: CUTAWAY_IDS.map((id) => ({ value: id, labelKey: `controls.cutawayOptions.${id}` })),
    select: (state) => state.cutaway,
    apply: applyCutaway,
  },
  {
    id: 'streams',
    labelKey: 'controls.streams',
    shortcut: 'S',
    options: STREAM_IDS.map((id) => ({ value: id, labelKey: `controls.streamOptions.${id}` })),
    select: (state) => state.streams,
    apply: applyStreams,
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
  viewToggle('person', 'P', PERSON_ICON),
  viewToggle('reverser', 'D', REVERSER_ICON),
];

export const ENGINE_SHORTCUTS: Readonly<Record<string, (state: EngineStoreState) => void>> = {
  '[': (state) => state.setThrust(state.thrust - LEVER_NUDGE),
  ']': (state) => state.setThrust(state.thrust + LEVER_NUDGE),
};
