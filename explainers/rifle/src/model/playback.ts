import { CYCLE_UNITS } from './clock';
import { CYCLE_MS, MS_PER_SECOND } from './constants';

export const REAL_PACE_SPEED = 4;
export const PACE_FACTOR = 4;
export const SPEED_RANGE = { min: 0, max: REAL_PACE_SPEED, step: 1, default: 1 } as const;

const CYCLE_SECONDS = CYCLE_MS / MS_PER_SECOND;

export function loopSeconds(speed: number): number {
  return CYCLE_SECONDS * PACE_FACTOR ** (REAL_PACE_SPEED - speed);
}

export function rate(speed: number): number {
  return CYCLE_UNITS / loopSeconds(speed);
}
