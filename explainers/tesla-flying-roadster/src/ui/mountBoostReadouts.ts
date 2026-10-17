import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import type { GasId } from '../ids';
import {
  G,
  NEWTONS_PER_KILONEWTON,
  boostAccel,
  boostLastsSeconds,
  massFlow,
  zeroToSixtySeconds,
} from '../model';
import { CALCULATOR_RANGES } from '../state';
import type { ThrusterCarStore } from '../state';
import {
  HUNDREDTHS,
  TENTHS,
  WHOLE,
  formatGees,
  formatKilonewtons,
  formatMassFlow,
  formatSeconds,
} from './format';

const REAR_THRUST_CONTROL = 'rearThrust';

type SelectedBoost = readonly [rearThrustKn: number, gas: GasId, litres: number];

function newtons(kilonewtons: number): number {
  return kilonewtons * NEWTONS_PER_KILONEWTON;
}

export function mountBoostReadouts(root: Document, store: ThrusterCarStore): Disposer {
  return mountRangeWidget(root, store, {
    control: REAR_THRUST_CONTROL,
    range: CALCULATOR_RANGES.rearThrustKn,
    select: (state): SelectedBoost => [state.rearThrustKn, state.gas, state.tankLitres],
    value: ([kilonewtons]) => kilonewtons,
    format: ([kilonewtons]) => formatKilonewtons(kilonewtons, WHOLE),
    set: (state, kilonewtons) => state.setRearThrustKn(kilonewtons),
    readouts: {
      boostAccel: ([kilonewtons]) => formatGees(boostAccel(newtons(kilonewtons)) / G),
      zeroToSixty: ([kilonewtons]) =>
        formatSeconds(zeroToSixtySeconds(newtons(kilonewtons)), HUNDREDTHS),
      boostFlow: ([kilonewtons, gas]) => formatMassFlow(massFlow(newtons(kilonewtons), gas), WHOLE),
      boostLasts: ([kilonewtons, gas, litres]) =>
        formatSeconds(boostLastsSeconds(newtons(kilonewtons), gas, litres), TENTHS),
    },
  });
}
