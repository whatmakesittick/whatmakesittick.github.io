import { MAX_REGULATOR_INDEX, POWER_RESERVE_HOURS } from '../model';

export const RESERVE_RANGE = {
  min: 0,
  max: POWER_RESERVE_HOURS,
  step: 0.5,
  default: POWER_RESERVE_HOURS,
} as const;

export const REGULATOR_RANGE = {
  min: -MAX_REGULATOR_INDEX,
  max: MAX_REGULATOR_INDEX,
  step: 0.02,
  default: 0,
} as const;
