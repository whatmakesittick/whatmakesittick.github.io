import type { GasId } from '../ids';
import { CAR_MASS_KG, ENTRY_SPEED_MS, SIXTY_MPH_MS } from './constants';
import { massFlow, storedMass } from './gas';
import { RAMP } from './layout';

export const SPRINT_SECONDS = 0.81;
export const SPRINT_ACCEL = SIXTY_MPH_MS / SPRINT_SECONDS;
export const SPRINT_THRUST_N = CAR_MASS_KG * SPRINT_ACCEL;
export const SPRINT_DISTANCE_M = (SIXTY_MPH_MS * SPRINT_SECONDS) / 2;
export const SETTLE_DECEL =
  (SIXTY_MPH_MS ** 2 - ENTRY_SPEED_MS ** 2) / (2 * (RAMP.entryX - SPRINT_DISTANCE_M));
export const SETTLE_SECONDS = (SIXTY_MPH_MS - ENTRY_SPEED_MS) / SETTLE_DECEL;

export function boostAccel(thrustN: number): number {
  return thrustN / CAR_MASS_KG;
}

export function zeroToSixtySeconds(thrustN: number): number {
  return SIXTY_MPH_MS / boostAccel(thrustN);
}

export function boostLastsSeconds(thrustN: number, gas: GasId, litres: number): number {
  return storedMass(gas, litres) / massFlow(thrustN, gas);
}
