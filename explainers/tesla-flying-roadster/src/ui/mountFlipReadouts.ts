import { toDegrees } from '@core/math';
import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { ROLL_NOZZLE_N, peakRollRate, rollSeconds, rollTorque } from '../model';
import { CALCULATOR_RANGES } from '../state';
import type { ThrusterCarStore } from '../state';
import { HUNDREDTHS, formatInertia, formatRollRate, formatSeconds, formatTorque } from './format';

const ROLL_INERTIA_CONTROL = 'rollInertia';

type SelectedInertia = readonly [rollInertia: number];

export function mountFlipReadouts(root: Document, store: ThrusterCarStore): Disposer {
  return mountRangeWidget(root, store, {
    control: ROLL_INERTIA_CONTROL,
    range: CALCULATOR_RANGES.rollInertia,
    select: (state): SelectedInertia => [state.rollInertia],
    value: ([inertia]) => inertia,
    format: ([inertia]) => formatInertia(inertia),
    set: (state, inertia) => state.setRollInertia(inertia),
    readouts: {
      rollTime: ([inertia]) => formatSeconds(rollSeconds(inertia, ROLL_NOZZLE_N), HUNDREDTHS),
      rollTorque: () => formatTorque(rollTorque(ROLL_NOZZLE_N)),
      rollRate: ([inertia]) => formatRollRate(toDegrees(peakRollRate(inertia, ROLL_NOZZLE_N))),
    },
  });
}
