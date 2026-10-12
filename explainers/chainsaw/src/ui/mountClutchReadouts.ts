import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { ENGAGE_RPM, IDLE_RPM } from '../model';
import { liveReading } from '../state';
import type { ChainsawStore } from '../state';
import { formatOil, formatPerTurn, formatRpm } from './format';
import { mountThrottle } from './mountThrottle';

const CLUTCH_THROTTLE_INPUT = 'clutch-throttle';

export function mountClutchReadouts(root: Document, store: ChainsawStore): Disposer {
  return disposeAll([
    mountThrottle(root, store, CLUTCH_THROTTLE_INPUT, {
      rpm: 'clutchRpm',
      chain: 'clutchChain',
      clutch: 'clutchState',
    }),
    mountLiveReadouts(root, store, {
      idleRpm: () => formatRpm(IDLE_RPM),
      engageRpm: () => formatRpm(ENGAGE_RPM),
      perTurn: () => formatPerTurn(),
      oil: (state) => formatOil(liveReading(state).oiling),
    }),
  ]);
}
