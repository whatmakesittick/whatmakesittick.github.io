import type { PumpId } from '../../model/scale';
import { FULL_TURN_DEG } from '../../model/rotor';

export const PUMPED_PER_ELECTRON_PAIR: Readonly<Record<PumpId, number>> = {
  complexOne: 4,
  complexThree: 4,
  complexFour: 2,
};

const PROTONS_PER_ELECTRON_PAIR = Object.values(PUMPED_PER_ELECTRON_PAIR).reduce(
  (sum, count) => sum + count,
  0,
);
const ELECTRONS_PER_PAIR = 2;
const ELECTRONS_PER_OXYGEN = 4;

function electronPairsPerLap(bladeCount: number): number {
  return bladeCount / PROTONS_PER_ELECTRON_PAIR;
}

export function pumpPeriodDeg(pump: PumpId, bladeCount: number): number {
  return FULL_TURN_DEG / (electronPairsPerLap(bladeCount) * PUMPED_PER_ELECTRON_PAIR[pump]);
}

export function electronPeriodDeg(bladeCount: number): number {
  return FULL_TURN_DEG / (electronPairsPerLap(bladeCount) * ELECTRONS_PER_PAIR);
}

export function oxygenPeriodDeg(bladeCount: number): number {
  return electronPeriodDeg(bladeCount) * ELECTRONS_PER_OXYGEN;
}
