import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { sortieAt } from '../state';
import type { FpvStore } from '../state';
import { formatAmps, formatVolts } from './format';

export function mountPowerReadouts(root: Document, store: FpvStore): Disposer {
  return mountLiveReadouts(root, store, {
    'power-volts': (state) => formatVolts(sortieAt(state).battery.volts),
    'power-amps': (state) => formatAmps(sortieAt(state).battery.amps),
  });
}
