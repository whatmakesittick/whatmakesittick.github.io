import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { TENSIONS } from '../model';
import type { SewingStoreState } from '../state';
import { TENSION_KEYS } from './format';
import {
  STITCH_LENGTH_CHOICES,
  STITCH_LENGTH_KEYS,
  STITCH_LENGTH_MM,
  nearestStitchLength,
} from './stitchLengths';

const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';
const CUTAWAY_ICON =
  '<rect x="4" y="4" width="16" height="16" rx="3" /><path class="icon-fill" d="M12 4h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5Z" />';

export const SEWING_CHOICES: readonly Choice<SewingStoreState>[] = [
  {
    id: 'tension',
    labelKey: 'controls.tension',
    shortcut: 'T',
    options: TENSIONS.map((tension) => ({ value: tension, labelKey: TENSION_KEYS[tension] })),
    select: (state) => state.tension,
    apply: (state, value) => state.setTension(parseOption(value, TENSIONS)),
  },
  {
    id: 'stitch-length',
    labelKey: 'controls.stitchLength',
    shortcut: 'S',
    options: STITCH_LENGTH_CHOICES.map((choice) => ({
      value: choice,
      labelKey: STITCH_LENGTH_KEYS[choice],
    })),
    select: (state) => nearestStitchLength(state.stitchLength),
    apply: (state, value) =>
      state.setStitchLength(STITCH_LENGTH_MM[parseOption(value, STITCH_LENGTH_CHOICES)]),
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
    view: 'cutaway',
    shortcut: 'C',
    nameKey: 'controls.views.cutaway.name',
    shortKey: 'controls.views.cutaway.short',
    hintKey: 'controls.views.cutaway.hint',
    icon: CUTAWAY_ICON,
  },
];
