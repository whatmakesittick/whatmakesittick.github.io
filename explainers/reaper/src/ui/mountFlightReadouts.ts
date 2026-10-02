import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { ReaperStore } from '../state';
import { formatEngineComparison, formatSpanComparison, formatWeightComparison } from './format';

export function mountFlightReadouts(root: Document, store: ReaperStore): Disposer {
  return mountLiveReadouts(root, store, {
    'flight-span': (state) => formatSpanComparison(state.comparison),
    'flight-weight': (state) => formatWeightComparison(state.comparison),
    'flight-engine': (state) => formatEngineComparison(state.comparison),
  });
}
