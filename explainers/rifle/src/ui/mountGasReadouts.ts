import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { cycleOf } from '../state';
import type { RifleStore } from '../state';
import { carrierPercent } from './cycleTexts';
import { formatGasResult, formatPercent } from './format';

export function mountGasReadouts(root: Document, store: RifleStore): Disposer {
  return mountLiveReadouts(root, store, {
    'gas-fill': (state) => formatPercent(cycleOf(state).shot.gas),
    'gas-carrier': carrierPercent,
    'gas-result': (state) => formatGasResult(state.gasPort),
  });
}
