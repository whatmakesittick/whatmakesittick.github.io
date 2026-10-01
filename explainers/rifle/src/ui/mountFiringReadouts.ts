import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { hammerStage, lockStage } from '../model';
import { cycleOf } from '../state';
import type { RifleStore } from '../state';
import { formatHammer, formatLock, formatPressure } from './format';

export function mountFiringReadouts(root: Document, store: RifleStore): Disposer {
  return mountLiveReadouts(root, store, {
    'firing-hammer': (state) => formatHammer(hammerStage(cycleOf(state).ms, state.gasPort)),
    'firing-lock': (state) => formatLock(lockStage(cycleOf(state).motion)),
    'firing-pressure': (state) => formatPressure(cycleOf(state).shot.pressure),
  });
}
