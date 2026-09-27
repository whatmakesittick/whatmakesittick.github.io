import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { EYEPIECE_IDS, OBJECTIVE_IDS } from '../model';
import type { MicroscopeStoreState } from '../state';
import { EYEPIECE_KEYS, OBJECTIVE_KEYS } from './format';

const RAYS_ICON = '<path d="M12 4v16" /><path d="M3 7l9 5 9-5M3 17l9-5 9 5" />';
const CUTAWAY_ICON =
  '<rect x="4" y="4" width="16" height="16" rx="3" /><path class="icon-fill" d="M12 4h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5Z" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const MICROSCOPE_CHOICES: readonly Choice<MicroscopeStoreState>[] = [
  {
    id: 'objective',
    labelKey: 'controls.objective',
    shortcut: 'O',
    options: OBJECTIVE_IDS.map((id) => ({ value: id, labelKey: OBJECTIVE_KEYS[id] })),
    select: (state) => state.objective,
    apply: (state, value) => state.setObjective(parseOption(value, OBJECTIVE_IDS)),
  },
  {
    id: 'eyepiece',
    labelKey: 'controls.eyepiece',
    shortcut: 'E',
    options: EYEPIECE_IDS.map((id) => ({ value: id, labelKey: EYEPIECE_KEYS[id] })),
    select: (state) => state.eyepiece,
    apply: (state, value) => state.setEyepiece(parseOption(value, EYEPIECE_IDS)),
  },
];

export const VIEW_TOGGLES: readonly ViewToggle[] = [
  {
    view: 'rays',
    shortcut: 'Y',
    nameKey: 'controls.views.rays.name',
    shortKey: 'controls.views.rays.short',
    hintKey: 'controls.views.rays.hint',
    icon: RAYS_ICON,
  },
  {
    view: 'cutaway',
    shortcut: 'C',
    nameKey: 'controls.views.cutaway.name',
    shortKey: 'controls.views.cutaway.short',
    hintKey: 'controls.views.cutaway.hint',
    icon: CUTAWAY_ICON,
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
