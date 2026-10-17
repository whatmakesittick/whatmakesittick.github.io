import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import type { GasId } from '../ids';
import { CORNER_NOZZLE_MAX_N, exhaustSpeed, isp, massFlow, nozzleAt } from '../model';
import { CALCULATOR_RANGES } from '../state';
import type { ThrusterCarStore } from '../state';
import {
  TENTHS,
  WHOLE,
  formatBar,
  formatMassFlow,
  formatSeconds,
  formatSpeedMs,
  formatThrust,
} from './format';

const PRESSURE_CONTROL = 'pressure';

type SelectedPressure = readonly [pressureBar: number, gas: GasId];

function cornerThrust(pressureBar: number): number {
  return nozzleAt(pressureBar, CORNER_NOZZLE_MAX_N);
}

export function mountNozzleReadouts(root: Document, store: ThrusterCarStore): Disposer {
  return mountRangeWidget(root, store, {
    control: PRESSURE_CONTROL,
    range: CALCULATOR_RANGES.pressureBar,
    select: (state): SelectedPressure => [state.pressureBar, state.gas],
    value: ([pressureBar]) => pressureBar,
    format: ([pressureBar]) => formatBar(pressureBar),
    set: (state, pressureBar) => state.setPressureBar(pressureBar),
    readouts: {
      nozzleThrust: ([pressureBar]) => formatThrust(cornerThrust(pressureBar)),
      nozzleFlow: ([pressureBar, gas]) =>
        formatMassFlow(massFlow(cornerThrust(pressureBar), gas), TENTHS),
      exhaustSpeed: ([, gas]) => formatSpeedMs(exhaustSpeed(gas), WHOLE),
      isp: ([, gas]) => formatSeconds(isp(gas), WHOLE),
    },
  });
}
