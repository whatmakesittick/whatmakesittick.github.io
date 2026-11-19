import { lerp, smoothstep } from '@core/math';

export const MOUTH_C = 37;
export const MELT_C = 0;
export const SERVING_RANGE_C = { min: -14, max: -6, step: 1, default: -12 } as const;
export const IN_MOUTH_S = 0;
export const TONGUE_WARM_END_S = 1.5;
export const MELT_S_PER_C = 0.3;
export const WARM_TAU_S = 4;
export const SWALLOW_S = 12;
export const SWALLOW_SLIDE_S = 0.8;

export function meltEndSeconds(servingC: number): number {
  return TONGUE_WARM_END_S + MELT_S_PER_C * (MELT_C - servingC);
}

export function biteTemperature(seconds: number, servingC: number): number {
  if (seconds < IN_MOUTH_S) return servingC;
  if (seconds < TONGUE_WARM_END_S) {
    return lerp(servingC, MELT_C, smoothstep(seconds, IN_MOUTH_S, TONGUE_WARM_END_S));
  }
  const meltEnd = meltEndSeconds(servingC);
  if (seconds < meltEnd) return MELT_C;
  return MOUTH_C - (MOUTH_C - MELT_C) * Math.exp(-(seconds - meltEnd) / WARM_TAU_S);
}

export function meltShare(seconds: number, servingC: number): number {
  return smoothstep(seconds, TONGUE_WARM_END_S, meltEndSeconds(servingC));
}

export function inMouth(seconds: number): boolean {
  return seconds >= IN_MOUTH_S && seconds < SWALLOW_S;
}

export function swallowShare(seconds: number): number {
  return smoothstep(seconds, SWALLOW_S, SWALLOW_S + SWALLOW_SLIDE_S);
}
