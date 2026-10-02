import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { VIDEO_IDS } from '../ids';
import type { FpvStoreState } from '../state';

const LINKS_ICON =
  '<path d="M5 19 12 12" /><circle cx="12" cy="12" r="1.6" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />';
const TRACK_ICON =
  '<path d="M4 18c3-1 4-5 7-6s5 1 7-1 1-5 2-6" stroke-dasharray="2.5 2.5" /><circle cx="4" cy="18" r="1.6" />';
const ARROWS_ICON =
  '<path d="M18.5 12a6.5 6.5 0 1 1-3.2-5.6" /><path d="M15.5 3.2v3.6h3.6" /><circle cx="12" cy="12" r="1.4" />';
const LABELS_ICON =
  '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />';

export const FPV_CHOICES: readonly Choice<FpvStoreState>[] = [
  {
    id: 'video',
    labelKey: 'controls.video.label',
    shortcut: 'V',
    options: VIDEO_IDS.map((video) => ({
      value: video,
      labelKey: `controls.videoOptions.${video}`,
    })),
    select: (state) => state.video,
    apply: (state, value) => state.setVideo(parseOption(value, VIDEO_IDS)),
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
  viewToggle('links', 'K', LINKS_ICON),
  viewToggle('track', 'T', TRACK_ICON),
  viewToggle('arrows', 'A', ARROWS_ICON),
  viewToggle('labels', 'L', LABELS_ICON),
];
