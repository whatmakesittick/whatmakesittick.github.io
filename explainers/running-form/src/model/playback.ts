import type { PaceId } from '../ids';
import { strideTimeS } from './paces';

export const CYCLE_UNITS = 1000;
export const REAL_TIME_SPEED = 4;
export const SPEED_RANGE = { min: 0, max: 4, step: 1, default: 2 } as const;

const SPEED_BASE = 2;
const HALF_CYCLE = CYCLE_UNITS / 2;

export function speedFactor(speed: number): number {
  return SPEED_BASE ** (speed - REAL_TIME_SPEED);
}

export function paceRate(pace: PaceId, stepRate: number, speed: number): number {
  return (CYCLE_UNITS / strideTimeS(pace, stepRate)) * speedFactor(speed);
}

export function wrapUnits(units: number): number {
  return ((units % CYCLE_UNITS) + CYCLE_UNITS) % CYCLE_UNITS;
}

export function unitsDelta(previous: number, next: number): number {
  const wrapped = wrapUnits(next - previous);
  return wrapped > HALF_CYCLE ? wrapped - CYCLE_UNITS : wrapped;
}
