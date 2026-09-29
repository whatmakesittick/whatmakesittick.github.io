import type { Choice, ViewToggle } from '@core/explainer';
import type { HeartStoreState } from '../state';

const CUTAWAY_ICON =
  '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" /><path d="M12 7v13" />';
const FLOW_ICON =
  '<path d="M12 3.5s-5.5 6-5.5 10a5.5 5.5 0 0 0 11 0c0-4-5.5-10-5.5-10Z" /><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" />';
const CONDUCTION_ICON = '<path d="M2.5 12.5h4l2-5 3.5 10 2.5-7 1.5 2h5.5" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const HEART_CHOICES: readonly Choice<HeartStoreState>[] = [];

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
  viewToggle('flow', 'F', FLOW_ICON),
  viewToggle('conduction', 'E', CONDUCTION_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
