import type { Disposer } from '@core/ui/disposers';
import { BLACK_HOLES } from '../model';
import type { BlackHoleState, BlackHoleStore } from '../state';
import { formatFallTime, formatHorizon, formatMass, formatTide } from './format';
import { mountLiveReadouts } from './liveReadouts';

function compared(state: BlackHoleState) {
  return BLACK_HOLES[state.comparison];
}

export function mountOthersReadouts(root: Document, store: BlackHoleStore): Disposer {
  return mountLiveReadouts(root, store, {
    'others-mass': (state) => formatMass(compared(state).massSolar),
    'others-horizon': (state) => formatHorizon(compared(state).rsKm),
    'others-fall': (state) => formatFallTime(compared(state).fallSecondsFrom5Rs),
    'others-tide': (state) => formatTide(compared(state).horizonTideG),
  });
}
