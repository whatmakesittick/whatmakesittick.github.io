import { BASE_UNITS_PER_SECOND } from './mission';

export const SPEED_RANGE = { min: 0.25, max: 4, step: 0.25, default: 1 } as const;

export function rate(speed: number): number {
  return speed * BASE_UNITS_PER_SECOND;
}
