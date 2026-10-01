import type { Disposer } from '@core/ui/disposers';
import { clocksOf } from '../state';
import type { BlackHoleStore } from '../state';
import { formatFlashTone, formatPercent, formatSeconds, formatShipClock } from './format';
import { mountLiveReadouts } from './liveReadouts';

export function mountFrozenReadouts(root: Document, store: BlackHoleStore): Disposer {
  return mountLiveReadouts(root, store, {
    'frozen-ship': (state) => formatShipClock(clocksOf(state).shipClock),
    'frozen-gap': (state) => formatSeconds(clocksOf(state).flashGap),
    'frozen-brightness': (state) => formatPercent(clocksOf(state).dimming),
    'frozen-colour': (state) => formatFlashTone(clocksOf(state).flashTone),
  });
}
