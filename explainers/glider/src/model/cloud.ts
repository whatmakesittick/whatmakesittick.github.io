import { clamp } from '@core/math';

export const SPREAD = { min: 2, max: 20, step: 1, default: 12 } as const;

const METRES_PER_DEGREE = 125;
const CLOUD_BASE_ROUNDING = 50;

export function clampSpread(spread: number): number {
  return clamp(spread, SPREAD.min, SPREAD.max);
}

export function cloudBase(spread: number): number {
  return spread * METRES_PER_DEGREE;
}

export function roundedCloudBase(spread: number): number {
  return Math.round(cloudBase(spread) / CLOUD_BASE_ROUNDING) * CLOUD_BASE_ROUNDING;
}

export const CUMULUS_BASE = cloudBase(SPREAD.default);
