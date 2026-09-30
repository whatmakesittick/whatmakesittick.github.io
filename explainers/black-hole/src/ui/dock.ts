import type { Choice, ViewToggle } from '@core/explainer';
import type { BlackHoleStoreState } from '../state';

const DISC_ICON = '<ellipse cx="12" cy="12" rx="9.5" ry="3.5" /><circle cx="12" cy="12" r="2.2" />';
const SHEET_ICON =
  '<path d="M3 8c3-2 15-2 18 0" /><path d="M3 8c0 4 5 5 7 8 1 1.5 3 1.5 4 0 2-3 7-4 7-8" /><path d="M6.5 8.5c1.5 3 3.5 4 5.5 6.5 2-2.5 4-3.5 5.5-6.5" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const BLACK_HOLE_CHOICES: readonly Choice<BlackHoleStoreState>[] = [];

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
  viewToggle('disc', 'D', DISC_ICON),
  viewToggle('sheet', 'S', SHEET_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
