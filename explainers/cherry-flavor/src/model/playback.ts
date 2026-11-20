import { UNITS_PER_S } from './timeMap';

export const REAL_TIME_SPEED = 2;
export const SPEED_RANGE = { min: 0, max: 3, step: 1, default: REAL_TIME_SPEED } as const;

const SPEED_BASE = 2;

export function speedFactor(speed: number): number {
  return SPEED_BASE ** (speed - REAL_TIME_SPEED);
}

export function nominalRate(speed: number): number {
  return UNITS_PER_S * speedFactor(speed);
}
