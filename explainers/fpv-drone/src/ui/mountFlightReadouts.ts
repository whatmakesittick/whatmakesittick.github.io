import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { FpvStore } from '../state';
import { formatMix, formatWhy } from './format';

export function mountFlightReadouts(root: Document, store: FpvStore): Disposer {
  return mountLiveReadouts(root, store, {
    'flight-mix': (state) => formatMix(state.move),
    'flight-why': (state) => formatWhy(state.move),
  });
}
