import type { GasId } from '../ids';
import { CAR_MASS_KG, SIXTY_MPH_MS } from './constants';
import { massFlow, storedMass } from './gas';
import { RAMP } from './layout';

export const BOOST_SECONDS = 3;
export const RUN_BOOST_N = (2 * CAR_MASS_KG * RAMP.entryX) / BOOST_SECONDS ** 2;
export const RAMP_ENTRY_SPEED_MS = (2 * RAMP.entryX) / BOOST_SECONDS;

export function boostAccel(thrustN: number): number {
  return thrustN / CAR_MASS_KG;
}

export function zeroToSixtySeconds(thrustN: number): number {
  return SIXTY_MPH_MS / boostAccel(thrustN);
}

export function boostLastsSeconds(thrustN: number, gas: GasId, litres: number): number {
  return storedMass(gas, litres) / massFlow(thrustN, gas);
}
