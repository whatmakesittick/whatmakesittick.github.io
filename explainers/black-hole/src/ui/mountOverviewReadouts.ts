import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { clocksOf } from '../state';
import type { BlackHoleStore } from '../state';
import { formatClock, formatShipClock } from './format';

export function mountOverviewReadouts(root: Document, store: BlackHoleStore): Disposer {
  return mountLiveReadouts(root, store, {
    'overview-probe': (state) => formatClock(clocksOf(state).probeClock),
    'overview-ship': (state) => formatShipClock(clocksOf(state).shipClock),
  });
}
