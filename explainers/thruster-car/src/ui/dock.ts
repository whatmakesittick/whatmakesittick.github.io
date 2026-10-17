import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { GAS_IDS, TANK_CHOICE_IDS } from '../ids';
import type { ViewId } from '../ids';
import { TANK_LITRES } from '../model';
import type { ThrusterCarStoreState } from '../state';

const NOZZLES_ICON =
  '<path d="M3 10h5l6-4v12l-6-4H3Z" /><path d="m17 8.5 3.5-1.5" /><path d="M17 12h4" /><path d="m17 15.5 3.5 1.5" />';
const FORCES_ICON =
  '<circle class="icon-fill" cx="12" cy="12" r="2" /><path d="M12 9V3" /><path d="m9 6 3-3 3 3" /><path d="M12 15v6" /><path d="m9 18 3 3 3-3" />';
const TANK_ICON =
  '<rect x="3" y="7" width="18" height="10" rx="5" /><path class="icon-fill" d="M12 7h4a5 5 0 0 1 0 10h-4Z" />';
const GHOST_ICON =
  '<path d="M3 19c2-8 5-12 9-12s7 4 9 12" stroke-dasharray="2.5 2.5" /><circle cx="3" cy="19" r="1.6" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export function applyGasChoice(state: ThrusterCarStoreState, value: string): void {
  state.setGas(parseOption(value, GAS_IDS));
}

export function applyTankChoice(state: ThrusterCarStoreState, value: string): void {
  state.setTankLitres(TANK_LITRES[parseOption(value, TANK_CHOICE_IDS)]);
}

export function tankChoiceOf(state: ThrusterCarStoreState): string {
  return String(state.tankLitres);
}

export const THRUSTER_CAR_CHOICES: readonly Choice<ThrusterCarStoreState>[] = [
  {
    id: 'gas',
    labelKey: 'controls.gas',
    shortcut: 'A',
    options: GAS_IDS.map((id) => ({ value: id, labelKey: `controls.gasOptions.${id}` })),
    select: (state) => state.gas,
    apply: applyGasChoice,
  },
  {
    id: 'tank',
    labelKey: 'controls.tank',
    shortcut: 'V',
    options: TANK_CHOICE_IDS.map((id) => ({ value: id, labelKey: `controls.tankOptions.${id}` })),
    select: tankChoiceOf,
    apply: applyTankChoice,
  },
];

function viewToggle(view: ViewId, shortcut: string, icon: string): ViewToggle {
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
  viewToggle('nozzles', 'N', NOZZLES_ICON),
  viewToggle('forces', 'F', FORCES_ICON),
  viewToggle('tank', 'T', TANK_ICON),
  viewToggle('ghost', 'G', GHOST_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
