import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import type { LinkMode } from '../ids';
import { VIDEO_DELAY_MS } from '../model';
import { runAt } from '../state';
import type { NavalDroneStore } from '../state';
import {
  formatDelay,
  formatLinkBoat,
  formatLinkCarrier,
  formatLinkNow,
  formatLinkTop,
  shownKnots,
} from './format';
import { inChapter } from './actions';

type SelectedDelay = readonly [delayMs: number, mode: LinkMode, knots: number];

export function mountLinkControl(root: Document, store: NavalDroneStore): Disposer {
  return disposeAll([
    mountRangeWidget(root, store, {
      control: 'video-delay',
      range: VIDEO_DELAY_MS,
      select: (state): SelectedDelay => [
        state.videoDelayMs,
        state.linkMode,
        shownKnots(runAt(state).boat.knots),
      ],
      value: ([delayMs]) => delayMs,
      format: ([delayMs]) => formatDelay(delayMs),
      set: inChapter('link', (state, delayMs: number) => state.setVideoDelay(delayMs)),
      readouts: {
        'link-now': ([delayMs, mode, knots]) => formatLinkNow(mode, delayMs, knots),
        'link-top': ([delayMs]) => formatLinkTop(delayMs),
      },
    }),
    mountLiveReadouts(root, store, {
      'link-carrier': (state) => formatLinkCarrier(state.linkMode),
      'link-boat': (state) => formatLinkBoat(state.linkMode),
    }),
  ]);
}
