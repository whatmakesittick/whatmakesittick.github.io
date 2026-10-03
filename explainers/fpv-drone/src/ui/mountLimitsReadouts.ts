import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { SPEEDSTERS, secondsOverField } from '../model';
import type { FpvStore } from '../state';
import { formatKmh, formatSeconds, formatWho } from './format';

export function mountLimitsReadouts(root: Document, store: FpvStore): Disposer {
  return mountLiveReadouts(root, store, {
    'limits-speed': (state) => formatKmh(SPEEDSTERS[state.speedster].topKmh),
    'limits-field': (state) => formatSeconds(secondsOverField(SPEEDSTERS[state.speedster].topKmh)),
    'limits-who': (state) => formatWho(state.speedster),
  });
}
