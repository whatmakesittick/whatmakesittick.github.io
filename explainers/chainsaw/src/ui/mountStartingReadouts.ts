import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { liveReading, revvedUp, startDisplayOf } from '../state';
import type { ChainsawState, ChainsawStore } from '../state';
import { formatEngineState, formatRpm, formatStartStep } from './format';

function revvedRpm(state: ChainsawState): string | null {
  return revvedUp(state) ? formatRpm(liveReading(state).rpm) : null;
}

export function mountStartingReadouts(root: Document, store: ChainsawStore): Disposer {
  return mountLiveReadouts(root, store, {
    startStep: (state) => revvedRpm(state) ?? formatStartStep(startDisplayOf(state)),
    engineState: (state) => revvedRpm(state) ?? formatEngineState(state.engine),
  });
}
