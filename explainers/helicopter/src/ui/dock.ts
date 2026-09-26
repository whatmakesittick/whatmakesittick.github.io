import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { FLIGHT_MODES } from '../model';
import type { HelicopterStoreState } from '../state';
import { FLIGHT_MODE_KEYS } from './format';

const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';
const FLOW_ICON = '<path d="M3 4h18M8 8v11M5 16l3 3 3-3M16 8v11M13 16l3 3 3-3" />';

export const HELICOPTER_CHOICES: readonly Choice<HelicopterStoreState>[] = [
  {
    id: 'flight-mode',
    labelKey: 'controls.flightMode',
    shortcut: 'M',
    options: FLIGHT_MODES.map((mode) => ({ value: mode, labelKey: FLIGHT_MODE_KEYS[mode] })),
    select: (state) => state.flightMode,
    apply: (state, value) => state.setFlightMode(parseOption(value, FLIGHT_MODES)),
  },
];

export const VIEW_TOGGLES: readonly ViewToggle[] = [
  {
    view: 'labels',
    shortcut: 'L',
    nameKey: 'controls.views.labels.name',
    shortKey: 'controls.views.labels.short',
    hintKey: 'controls.views.labels.hint',
    icon: LABELS_ICON,
  },
  {
    view: 'flow',
    shortcut: 'F',
    nameKey: 'controls.views.flow.name',
    shortKey: 'controls.views.flow.short',
    hintKey: 'controls.views.flow.hint',
    icon: FLOW_ICON,
  },
];
