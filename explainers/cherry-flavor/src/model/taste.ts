import { clamp, lerp, smoothstep } from '@core/math';
import type { FlavorId, TasteReading } from '../ids';
import { IN_MOUTH_S, SWALLOW_S, biteTemperature } from './bite';
import { SOUR } from './odorants';

export const TASTE_ONSET_S = 0.5;
export const AFTERTASTE_TAU_S = 2;
export const COLD_SWEETNESS = { lowC: 5, highC: 12, floor: 0.6 } as const;
export const COLD_FELT_C = 20;
export const COLD_SPAN_C = 34;

export function presence(seconds: number): number {
  if (seconds < IN_MOUTH_S) return 0;
  if (seconds < SWALLOW_S) return smoothstep(seconds, IN_MOUTH_S, IN_MOUTH_S + TASTE_ONSET_S);
  return Math.exp(-(seconds - SWALLOW_S) / AFTERTASTE_TAU_S);
}

export function sweetness(celsius: number): number {
  const { lowC, highC, floor } = COLD_SWEETNESS;
  return lerp(floor, 1, smoothstep(celsius, lowC, highC));
}

export function coldness(celsius: number): number {
  return clamp((COLD_FELT_C - celsius) / COLD_SPAN_C, 0, 1);
}

export function tasteAt(
  seconds: number,
  servingC: number,
  flavor: FlavorId,
  out: TasteReading = { sweet: 0, sour: 0, cold: 0 },
): TasteReading {
  const felt = presence(seconds);
  const celsius = biteTemperature(seconds, servingC);
  out.sweet = felt * sweetness(celsius);
  out.sour = felt * SOUR[flavor];
  out.cold = felt * coldness(celsius);
  return out;
}
