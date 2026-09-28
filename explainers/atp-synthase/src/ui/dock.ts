import type { Choice, ViewToggle } from '@core/explainer';
import type { AtpSynthaseStoreState } from '../state';

const MEMBRANE_ICON =
  '<circle cx="6" cy="6.5" r="2" /><circle cx="12" cy="6.5" r="2" /><circle cx="18" cy="6.5" r="2" />' +
  '<circle cx="6" cy="17.5" r="2" /><circle cx="12" cy="17.5" r="2" /><circle cx="18" cy="17.5" r="2" />' +
  '<path d="M6 8.5v7M12 8.5v7M18 8.5v7" />';
const CUTAWAY_ICON =
  '<path d="M7 8.5a5 5 0 0 1 10 0v5a5 5 0 0 1-10 0Z" stroke-dasharray="2.5 2" /><path d="M12 5v16" />';
const FLOW_ICON =
  '<circle cx="5.5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><path d="M16 12h5" /><path d="m18.5 9 2.5 3-2.5 3" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const ATP_SYNTHASE_CHOICES: readonly Choice<AtpSynthaseStoreState>[] = [];

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
  viewToggle('membrane', 'M', MEMBRANE_ICON),
  viewToggle('cutaway', 'C', CUTAWAY_ICON),
  viewToggle('flow', 'F', FLOW_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
