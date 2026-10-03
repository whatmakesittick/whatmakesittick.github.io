import { BOAT } from './layout';
import { knotsToMs } from './scale';

export const VIDEO_DELAY_MS = { min: 50, max: 1000, step: 10, default: 250 } as const;
export const MS_PER_SECOND = 1000;

export function lagMetres(delayMs: number, knots: number): number {
  return (knotsToMs(knots) * delayMs) / MS_PER_SECOND;
}

export function boatLengths(metres: number): number {
  return metres / BOAT.length;
}
