import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import type { GasId } from '../ids';
import { fillMinutes, pressureAt, storedMass, storedWorkMj, tankShellKg } from '../model';
import { CALCULATOR_RANGES } from '../state';
import type { ThrusterCarStore } from '../state';
import { formatBar, formatKilograms, formatMinutes, formatPercent, formatWork } from './format';

const FILL_CONTROL = 'fill';

type SelectedFill = readonly [share: number, gas: GasId, litres: number];

export function mountTankReadouts(root: Document, store: ThrusterCarStore): Disposer {
  return disposeAll([
    mountRangeWidget(root, store, {
      control: FILL_CONTROL,
      range: CALCULATOR_RANGES.fillShare,
      select: (state): SelectedFill => [state.fillShare, state.gas, state.tankLitres],
      value: ([share]) => share,
      format: ([share]) => formatPercent(share),
      set: (state, share) => state.setFillShare(share),
      readouts: {
        fillMass: ([share, gas, litres]) => formatKilograms(storedMass(gas, litres) * share),
        fillWork: ([share, gas, litres]) => formatWork(storedWorkMj(gas, litres) * share),
        fillPressure: ([share]) => formatBar(pressureAt(share)),
        fillTime: ([share, gas, litres]) => formatMinutes(fillMinutes(gas, litres, share)),
      },
    }),
    mountLiveReadouts(root, store, {
      tankShell: (state) => formatKilograms(tankShellKg(state.tankLitres)),
    }),
  ]);
}
