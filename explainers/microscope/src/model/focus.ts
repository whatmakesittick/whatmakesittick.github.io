import { clamp } from '@core/math';

export const FOCUS = { min: -20, max: 20, step: 1, default: 0 } as const;
export const DEPTHS_TO_FULL_BLUR = 4;

export function clampFocus(micrometres: number): number {
  return clamp(micrometres, FOCUS.min, FOCUS.max);
}

export function defocus(focus: number, depth: number): number {
  return Math.max(0, Math.abs(focus) - depth / 2);
}

export function blurShare(focus: number, depth: number): number {
  return Math.min(1, defocus(focus, depth) / (depth * DEPTHS_TO_FULL_BLUR));
}
