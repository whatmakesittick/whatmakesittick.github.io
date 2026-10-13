import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { phaseOf } from '../model';
import { turningRpm } from '../state';
import type { ChainsawStore } from '../state';
import { formatPhaseNow, formatStrokes, formatTurnTime } from './format';

export function mountEngineReadouts(root: Document, store: ChainsawStore): Disposer {
  return mountLiveReadouts(root, store, {
    turnTime: (state) => formatTurnTime(turningRpm(state)),
    strokes: (state) => formatStrokes(turningRpm(state)),
    phaseNow: (state) => formatPhaseNow(phaseOf(state.phase)),
  });
}
