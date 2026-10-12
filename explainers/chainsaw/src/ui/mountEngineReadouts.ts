import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { phaseOf } from '../model';
import { liveReading } from '../state';
import type { ChainsawStore } from '../state';
import { formatPhaseNow, formatStrokes, formatTurnTime } from './format';

export function mountEngineReadouts(root: Document, store: ChainsawStore): Disposer {
  return mountLiveReadouts(root, store, {
    turnTime: (state) => formatTurnTime(liveReading(state).rpm),
    strokes: (state) => formatStrokes(liveReading(state).rpm),
    phaseNow: (state) => formatPhaseNow(phaseOf(state.phase)),
  });
}
