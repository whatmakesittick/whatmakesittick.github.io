import type { PaceId } from '../ids';
import { cycleSeconds } from './paces';

export const CYCLE_UNITS = 1000;
export const REAL_TIME_SPEED = 3;
export const SPEED_RANGE = { min: 0, max: 3, step: 1, default: 2 } as const;

const SPEED_BASE = 2;

export function speedFactor(speed: number): number {
  return SPEED_BASE ** (speed - REAL_TIME_SPEED);
}

export function paceRate(pace: PaceId, speed: number): number {
  return (CYCLE_UNITS / cycleSeconds(pace)) * speedFactor(speed);
}

export function wrapUnits(units: number): number {
  return ((units % CYCLE_UNITS) + CYCLE_UNITS) % CYCLE_UNITS;
}
