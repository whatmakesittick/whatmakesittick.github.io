import type { Choice, ViewToggle } from '@core/explainer';
import type { RifleStoreState } from '../state';

const CUTAWAY_ICON = '<path d="M9 3.5h6v4l3.5 12.5h-13L9 7.5Z" /><path d="M12 3.5V20" />';
const GAS_ICON =
  '<path d="M7.5 17.5a3.5 3.5 0 0 1-.6-6.95 5 5 0 0 1 9.5-1.3 3.9 3.9 0 0 1 .6 8.25Z" /><path d="M9 21h6" />';
const TRAIL_ICON =
  '<path d="M3 9h6" /><path d="M2 12h8" /><path d="M3 15h6" /><path d="M12 9h5.5a3 3 0 0 1 0 6H12Z" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const RIFLE_CHOICES: readonly Choice<RifleStoreState>[] = [];

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
  viewToggle('gas', 'G', GAS_ICON),
  viewToggle('trail', 'T', TRAIL_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
