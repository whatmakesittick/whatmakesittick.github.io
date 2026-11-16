import { PHASE_RANGES, POUR_S, EXHAUSTION_S } from './timeMap';
import { IODATE_REF_M, REF_TEMPERATURE_C, switchSeconds as switchSecondsAt } from './recipe';

export const REAL_TIME_SPEED = 2;
export const SPEED_RANGE = { min: 0, max: 3, step: 1, default: REAL_TIME_SPEED } as const;

const SPEED_BASE = 2;

export function speedFactor(speed: number): number {
  return SPEED_BASE ** (speed - REAL_TIME_SPEED);
}

export const REF_SWITCH_S = switchSecondsAt(IODATE_REF_M, REF_TEMPERATURE_C);

const INDUCTION_UNITS = PHASE_RANGES.induction.end - PHASE_RANGES.induction.start;
const INDUCTION_REF_S = REF_SWITCH_S - EXHAUSTION_S - POUR_S;

export const NOMINAL_UNITS_PER_S = INDUCTION_UNITS / INDUCTION_REF_S;

export function nominalRate(speed: number): number {
  return speedFactor(speed) * NOMINAL_UNITS_PER_S;
}
