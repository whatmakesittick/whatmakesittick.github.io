import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { crankcaseTrend } from '../state';
import type { ChainsawStore } from '../state';
import { formatCrankcase, formatPercent } from './format';

export function mountFuelReadouts(root: Document, store: ChainsawStore): Disposer {
  return mountLiveReadouts(root, store, {
    throttleOpen: (state) => formatPercent(state.throttle),
    crankcase: (state) => formatCrankcase(crankcaseTrend(state.phase)),
  });
}
