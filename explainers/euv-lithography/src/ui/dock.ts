import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { MACHINE_IDS } from '../ids';
import type { DockViewId } from '../ids';
import type { EuvStoreState } from '../state';

const BEAM_ICON =
  '<path d="M3 18 9 6l6 9 6-12" /><circle class="icon-fill" cx="9" cy="6" r="1.8" /><circle class="icon-fill" cx="15" cy="15" r="1.8" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';
const CUTAWAY_ICON =
  '<rect x="4" y="4" width="16" height="16" rx="3" /><path class="icon-fill" d="M12 4h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5Z" />';
const INSET_ICON =
  '<rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="14.5" cy="9.5" r="4" /><path d="m17.5 12.5 3 3" />';
const FOLLOW_ICON =
  '<path d="M3.5 8V3.5H8" /><path d="M16 3.5h4.5V8" /><path d="M20.5 16v4.5H16" /><path d="M8 20.5H3.5V16" /><circle class="icon-fill" cx="12" cy="12" r="2.6" />';

export function applyMachineChoice(state: EuvStoreState, value: string): void {
  state.setMachine(parseOption(value, MACHINE_IDS));
}

export const EUV_CHOICES: readonly Choice<EuvStoreState>[] = [
  {
    id: 'machine',
    labelKey: 'controls.machine',
    shortcut: 'M',
    options: MACHINE_IDS.map((id) => ({ value: id, labelKey: `controls.machineOptions.${id}` })),
    select: (state) => state.machine,
    apply: applyMachineChoice,
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
  viewToggle('beam', 'B', BEAM_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
  viewToggle('cutaway', 'C', CUTAWAY_ICON),
  viewToggle('inset', 'I', INSET_ICON),
  viewToggle('follow', 'F', FOLLOW_ICON),
];
