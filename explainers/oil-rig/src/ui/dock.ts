import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { BIT_IDS } from '../model';
import type { OilRigStoreState } from '../state';
import { BIT_KEYS } from './format';

const CUTAWAY_ICON =
  '<rect x="4" y="4" width="16" height="16" rx="3" /><path class="icon-fill" d="M12 4h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5Z" />';
const MUD_ICON =
  '<path d="M8 4v14" /><path d="M5 15l3 3 3-3" /><path d="M16 20V6" /><path d="M13 9l3-3 3 3" />';
const FLOW_ICON =
  '<path d="M12 3.5c3.2 4.3 5.5 7.4 5.5 10.3a5.5 5.5 0 0 1-11 0c0-2.9 2.3-6 5.5-10.3Z" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const OIL_RIG_CHOICES: readonly Choice<OilRigStoreState>[] = [
  {
    id: 'bit',
    labelKey: 'controls.bit',
    shortcut: 'B',
    options: BIT_IDS.map((id) => ({ value: id, labelKey: BIT_KEYS[id] })),
    select: (state) => state.bit,
    apply: (state, value) => state.setBit(parseOption(value, BIT_IDS)),
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
  viewToggle('mud', 'M', MUD_ICON),
  viewToggle('flow', 'F', FLOW_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
