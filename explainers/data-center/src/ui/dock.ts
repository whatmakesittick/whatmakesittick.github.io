import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { COOLING_IDS, LOAD_IDS } from '../ids';
import type { DockViewId } from '../ids';
import type { DataCenterStoreState } from '../state';

const POWER_ICON = '<path d="M13 3 5.5 13.5H11L10 21l7.5-10.5H12Z" />';
const HEAT_ICON =
  '<path d="M7 20.5c-1.8-2 1.8-3.6 0-5.6s1.8-3.6 0-5.6" /><path d="M12 20.5c-1.8-2 1.8-3.6 0-5.6s1.8-3.6 0-5.6S13.8 5.7 12 3.5" /><path d="M17 20.5c-1.8-2 1.8-3.6 0-5.6s1.8-3.6 0-5.6" />';
const PACKETS_ICON =
  '<rect x="2.5" y="9" width="5" height="6" rx="1" /><rect x="16.5" y="9" width="5" height="6" rx="1" /><path d="M9.5 12h5" stroke-dasharray="2 1.5" /><path d="m12.5 9.5 2.5 2.5-2.5 2.5" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';
const CUTAWAY_ICON =
  '<rect x="4" y="4" width="16" height="16" rx="3" /><path class="icon-fill" d="M12 4h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5Z" />';
const FOLLOW_ICON =
  '<path d="M3.5 8V3.5H8" /><path d="M16 3.5h4.5V8" /><path d="M20.5 16v4.5H16" /><path d="M8 20.5H3.5V16" /><circle class="icon-fill" cx="12" cy="12" r="2.6" />';

export function applyCoolingChoice(state: DataCenterStoreState, value: string): void {
  state.setCooling(parseOption(value, COOLING_IDS));
}

export function applyLoadChoice(state: DataCenterStoreState, value: string): void {
  state.setLoad(parseOption(value, LOAD_IDS));
}

export const DATA_CENTER_CHOICES: readonly Choice<DataCenterStoreState>[] = [
  {
    id: 'cooling',
    labelKey: 'controls.cooling',
    shortcut: 'W',
    options: COOLING_IDS.map((id) => ({ value: id, labelKey: `controls.coolingOptions.${id}` })),
    select: (state) => state.cooling,
    apply: applyCoolingChoice,
  },
  {
    id: 'load',
    labelKey: 'controls.load',
    shortcut: 'D',
    options: LOAD_IDS.map((id) => ({ value: id, labelKey: `controls.loadOptions.${id}` })),
    select: (state) => state.load,
    apply: applyLoadChoice,
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
  viewToggle('power', 'P', POWER_ICON),
  viewToggle('heat', 'H', HEAT_ICON),
  viewToggle('packets', 'N', PACKETS_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
  viewToggle('cutaway', 'C', CUTAWAY_ICON),
  viewToggle('follow', 'F', FOLLOW_ICON),
];
