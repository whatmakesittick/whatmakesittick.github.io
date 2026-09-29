import type { Choice, ViewToggle } from '@core/explainer';
import type { RaptorStoreState } from '../state';

const CUTAWAY_ICON = '<path d="M9 3.5h6v4l3.5 12.5h-13L9 7.5Z" /><path d="M12 3.5V20" />';
const FLOW_ICON = '<path d="M3.5 8.5h13l-3-3" /><path d="M20.5 15.5h-13l3 3" />';
const FLAME_ICON =
  '<path d="M12 20.5c-3.4 0-5.8-2.3-5.8-5.4 0-3.3 2.8-5.2 3.5-9.1 2.5 1.5 3.9 3.9 3.9 6.2 1-.8 1.5-1.9 1.7-3.3 1.6 1.4 2.5 3.7 2.5 6.1 0 3.2-2.4 5.5-5.8 5.5Z" />';
const CLUSTER_ICON =
  '<circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="7.2" r="1.3" /><circle cx="16.2" cy="14.4" r="1.3" /><circle cx="7.8" cy="14.4" r="1.3" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const RAPTOR_CHOICES: readonly Choice<RaptorStoreState>[] = [];

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
  viewToggle('flame', 'P', FLAME_ICON),
  viewToggle('cluster', 'B', CLUSTER_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
