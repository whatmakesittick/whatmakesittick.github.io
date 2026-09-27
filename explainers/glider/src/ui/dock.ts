import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { GLIDER_TYPES } from '../model';
import type { GliderStoreState } from '../state';
import { GLIDER_KEYS } from './format';

const FORCES_ICON = '<path d="M12 3v7M9 6l3-3 3 3M12 14v7M9 18l3 3 3-3M10 12H3M6 9l-3 3 3 3" />';
const AIR_ICON = '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const GLIDER_CHOICES: readonly Choice<GliderStoreState>[] = [
  {
    id: 'glider',
    labelKey: 'controls.glider',
    shortcut: 'G',
    options: GLIDER_TYPES.map((type) => ({ value: type, labelKey: GLIDER_KEYS[type] })),
    select: (state) => state.glider,
    apply: (state, value) => state.setGlider(parseOption(value, GLIDER_TYPES)),
  },
];

export const VIEW_TOGGLES: readonly ViewToggle[] = [
  {
    view: 'forces',
    shortcut: 'F',
    nameKey: 'controls.views.forces.name',
    shortKey: 'controls.views.forces.short',
    hintKey: 'controls.views.forces.hint',
    icon: FORCES_ICON,
  },
  {
    view: 'air',
    shortcut: 'A',
    nameKey: 'controls.views.air.name',
    shortKey: 'controls.views.air.short',
    hintKey: 'controls.views.air.hint',
    icon: AIR_ICON,
  },
  {
    view: 'labels',
    shortcut: 'L',
    nameKey: 'controls.views.labels.name',
    shortKey: 'controls.views.labels.short',
    hintKey: 'controls.views.labels.hint',
    icon: LABELS_ICON,
  },
];
