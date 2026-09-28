import type { Choice, ViewToggle } from '@core/explainer';
import type { WatchStoreState } from '../state';

const DIAL_ICON = '<circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />';
const BRIDGES_ICON =
  '<path d="M3 9h18" /><path d="M4.5 9v9" /><path d="M19.5 9v9" /><path d="M8 18a4 4 0 0 1 8 0" />';
const ENERGY_ICON = '<path d="M13 3 5.5 13.5H11L10 21l7.5-10.5H12Z" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const WATCH_CHOICES: readonly Choice<WatchStoreState>[] = [];

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
  viewToggle('dial', 'D', DIAL_ICON),
  viewToggle('bridges', 'B', BRIDGES_ICON),
  viewToggle('energy', 'E', ENERGY_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
