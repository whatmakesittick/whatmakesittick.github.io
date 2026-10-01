import type { Disposer } from '@core/ui/disposers';
import { cycleOf } from '../state';
import type { RifleStore } from '../state';
import { carrierPercent } from './cycleTexts';
import { formatGasResult, formatPercent } from './format';
import { mountLiveReadouts } from './liveReadouts';

export function mountGasReadouts(root: Document, store: RifleStore): Disposer {
  return mountLiveReadouts(root, store, {
    'gas-fill': (state) => formatPercent(cycleOf(state).shot.gas),
    'gas-carrier': carrierPercent,
    'gas-result': (state) => formatGasResult(state.gasPort),
  });
}
