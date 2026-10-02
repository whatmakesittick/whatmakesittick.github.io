import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { FpvStore } from '../state';
import { formatLimit, formatStick } from './format';

export function mountModeReadouts(root: Document, store: FpvStore): Disposer {
  return mountLiveReadouts(root, store, {
    'mode-stick': (state) => formatStick(state.flightMode),
    'mode-limit': (state) => formatLimit(state.flightMode),
  });
}
