import { clamp } from '@core/math';
import type { SpeedMarkId } from '../ids';
import { HULL_SPEED_KN, HUMP_PEAK_KN, PLANING_FROM_KN } from './hull';
import { BOAT } from './layout';

export const TRIAL_KNOTS = { min: 0, max: BOAT.topKnots, step: 0.1 } as const;
export const THROTTLE_PERCENT = { min: 0, max: 100, step: 1 } as const;
export const MARK_TOLERANCE_KN = 0.25;

export const SPEED_MARKS: Readonly<Record<SpeedMarkId, number>> = {
  hullSpeed: HULL_SPEED_KN,
  hump: HUMP_PEAK_KN,
  planing: PLANING_FROM_KN,
  cruise: BOAT.cruiseKnots,
  top: BOAT.topKnots,
};

const PERCENT = 100;

export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function trialKnotsOf(knots: number): number {
  const stepped = roundToStep(clamp(knots, TRIAL_KNOTS.min, TRIAL_KNOTS.max), TRIAL_KNOTS.step);
  return Number(stepped.toFixed(1));
}

export function throttleShareOf(percent: number): number {
  return clamp(percent, THROTTLE_PERCENT.min, THROTTLE_PERCENT.max) / PERCENT;
}

export function throttlePercentOf(share: number): number {
  return roundToStep(share * PERCENT, THROTTLE_PERCENT.step);
}

export function speedMarkAt(knots: number): SpeedMarkId | undefined {
  return (Object.keys(SPEED_MARKS) as SpeedMarkId[]).find(
    (mark) => Math.abs(SPEED_MARKS[mark] - knots) <= MARK_TOLERANCE_KN,
  );
}
