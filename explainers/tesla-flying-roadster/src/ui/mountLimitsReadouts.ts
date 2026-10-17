import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { hoverFlow, hoverSeconds, jetPowerMw, totalImpulseKns } from '../model';
import { runOutcome, runUsedShare } from '../state';
import type { ThrusterCarStore } from '../state';
import {
  TENTHS,
  formatImpulse,
  formatMassFlow,
  formatMegawatts,
  formatOutcome,
  formatPercent,
  formatSeconds,
} from './format';

export function mountLimitsReadouts(root: Document, store: ThrusterCarStore): Disposer {
  return mountLiveReadouts(root, store, {
    hoverFlow: (state) => formatMassFlow(hoverFlow(state.gas), TENTHS),
    hoverTime: (state) => formatSeconds(hoverSeconds(state.gas, state.tankLitres), TENTHS),
    jetPower: (state) => formatMegawatts(jetPowerMw(state.gas)),
    totalImpulse: (state) => formatImpulse(totalImpulseKns(state.gas, state.tankLitres)),
    runUsed: (state) => formatPercent(runUsedShare(state.gas, state.tankLitres)),
    runOutcome: (state) => formatOutcome(runOutcome(state.gas, state.tankLitres)),
  });
}
