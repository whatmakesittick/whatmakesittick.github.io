import { clamp } from '@core/math';
import type { SpeedMarkId } from '../ids';
import { HULL_SPEED_KN, HUMP_PEAK_KN, PLANING_FROM_KN } from './hull';
import { BOAT } from './layout';

export interface SteppedRange {
  min: number;
  max: number;
  step: number;
}

export const PERCENT = 100;
export const TRIAL_KNOTS = { min: 0, max: BOAT.topKnots, step: 0.1 } as const;
export const THROTTLE_PERCENT = { min: 0, max: PERCENT, step: 1 } as const;
export const MARK_TOLERANCE_KN = 0.25;

export const SPEED_MARKS: Readonly<Record<SpeedMarkId, number>> = {
  hullSpeed: HULL_SPEED_KN,
  hump: HUMP_PEAK_KN,
  planing: PLANING_FROM_KN,
  cruise: BOAT.cruiseKnots,
  top: BOAT.topKnots,
};

const DECIMAL_POINT = '.';
const WHOLE_STEP_DECIMALS = 0;

function decimalsOf(step: number): number {
  const [, fraction] = String(step).split(DECIMAL_POINT);
  return fraction?.length ?? WHOLE_STEP_DECIMALS;
}

export function stepTo(value: number, range: SteppedRange): number {
  const stepped = Math.round(clamp(value, range.min, range.max) / range.step) * range.step;
  return Number(stepped.toFixed(decimalsOf(range.step)));
}

export function trialKnotsOf(knots: number): number {
  return stepTo(knots, TRIAL_KNOTS);
}

export function throttleShareOf(percent: number): number {
  return clamp(percent, THROTTLE_PERCENT.min, THROTTLE_PERCENT.max) / PERCENT;
}

export function throttlePercentOf(share: number): number {
  return stepTo(share * PERCENT, THROTTLE_PERCENT);
}

export function speedMarkAt(knots: number): SpeedMarkId | undefined {
  return (Object.keys(SPEED_MARKS) as SpeedMarkId[]).find(
    (mark) => Math.abs(SPEED_MARKS[mark] - knots) <= MARK_TOLERANCE_KN,
  );
}
