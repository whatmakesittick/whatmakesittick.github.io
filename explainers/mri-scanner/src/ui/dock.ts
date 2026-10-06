import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { FIELD_IDS, WEIGHTING_IDS } from '../ids';
import type { MriScannerStoreState } from '../state';

const CUTAWAY_ICON =
  '<rect x="3.5" y="5" width="17" height="14" rx="7" /><circle cx="12" cy="12" r="3.2" /><path d="M12 5v4M12 15v4" />';
const FIELD_LINES_ICON =
  '<path d="M3 12h18" /><path d="M4 12c0-4 4-7 8-7s8 3 8 7" /><path d="M4 12c0 4 4 7 8 7s8-3 8-7" /><path d="m17.6 10.4 1.9 1.6-1.9 1.6" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const MRI_SCANNER_CHOICES: readonly Choice<MriScannerStoreState>[] = [
  {
    id: 'field',
    labelKey: 'controls.field',
    shortcut: 'B',
    options: FIELD_IDS.map((field) => ({
      value: field,
      labelKey: `controls.fieldOptions.${field}`,
    })),
    select: (state) => state.field,
    apply: (state, value) => state.setField(parseOption(value, FIELD_IDS)),
  },
  {
    id: 'weighting',
    labelKey: 'controls.weighting',
    shortcut: 'W',
    options: WEIGHTING_IDS.map((weighting) => ({
      value: weighting,
      labelKey: `controls.weightingOptions.${weighting}`,
    })),
    select: (state) => state.weighting,
    apply: (state, value) => state.setWeighting(parseOption(value, WEIGHTING_IDS)),
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
  viewToggle('fieldLines', 'F', FIELD_LINES_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
