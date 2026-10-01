import type { Disposer } from '@core/ui/disposers';
import { clocksOf, fallOf } from '../state';
import type { BlackHoleStore } from '../state';
import { formatClock, formatLightSpeed, formatTide } from './format';
import { mountLiveReadouts } from './liveReadouts';

export function mountInsideReadouts(root: Document, store: BlackHoleStore): Disposer {
  return mountLiveReadouts(root, store, {
    'inside-left': (state) => formatClock(fallOf(state).timeLeft),
    'inside-speed': (state) => formatLightSpeed(fallOf(state).speed),
    'inside-tide': (state) => formatTide(clocksOf(state).tide),
  });
}
