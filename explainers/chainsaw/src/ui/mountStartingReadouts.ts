import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { startDisplayOf } from '../state';
import type { ChainsawStore } from '../state';
import { formatEngineState, formatStartStep } from './format';

export function mountStartingReadouts(root: Document, store: ChainsawStore): Disposer {
  return mountLiveReadouts(root, store, {
    startStep: (state) => formatStartStep(startDisplayOf(state)),
    engineState: (state) => formatEngineState(state.engine),
  });
}
