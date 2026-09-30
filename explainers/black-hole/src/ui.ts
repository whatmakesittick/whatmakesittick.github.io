import type { ViewToggle } from '@core/explainer';

const DISC_ICON = '<ellipse cx="12" cy="12" rx="9.5" ry="3.5" /><circle cx="12" cy="12" r="2.2" />';

export const VIEW_TOGGLES: readonly ViewToggle[] = [
  {
    view: 'disc',
    shortcut: 'D',
    nameKey: 'controls.views.disc.name',
    shortKey: 'controls.views.disc.short',
    hintKey: 'controls.views.disc.hint',
    icon: DISC_ICON,
  },
];
