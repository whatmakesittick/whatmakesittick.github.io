import type { Choice, ViewToggle } from '@core/explainer';
import type { SolarPanelStoreState } from '../state';

const SUN_ICON =
  '<circle cx="12" cy="12" r="4" /><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />';
const SLICE_ICON =
  '<circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /><path d="M7 9h7M7 12h7" />';
const FLOW_ICON = '<path d="M4 8h13l-3-3" /><path d="M20 16H7l3 3" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const SOLAR_PANEL_CHOICES: readonly Choice<SolarPanelStoreState>[] = [];

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
  viewToggle('sun', 'S', SUN_ICON),
  viewToggle('slice', 'M', SLICE_ICON),
  viewToggle('flow', 'F', FLOW_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
