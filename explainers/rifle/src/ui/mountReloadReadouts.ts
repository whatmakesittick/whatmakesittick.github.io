import type { Disposer } from '@core/ui/disposers';
import { caseStage, roundStage } from '../model';
import { cycleOf } from '../state';
import type { RifleStore } from '../state';
import { carrierPercent, timeUntilReady } from './cycleTexts';
import { formatCase, formatComparison, formatRound } from './format';
import { mountLiveReadouts } from './liveReadouts';

export function mountReloadReadouts(root: Document, store: RifleStore): Disposer {
  return mountLiveReadouts(root, store, {
    'reload-carrier': carrierPercent,
    'reload-case': (state) => formatCase(caseStage(cycleOf(state).ms, state.gasPort)),
    'reload-round': (state) => formatRound(roundStage(cycleOf(state).motion)),
    'reload-left': timeUntilReady,
    'reload-compare': (state) => formatComparison(state.comparison),
  });
}
