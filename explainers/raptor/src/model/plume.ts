import { clamp, smoothstep } from '@core/math';
import type { PlumeState } from '../ids';
import { NOZZLE_EXIT } from './layout';

export const EXIT_PRESSURE_BAR = 0.9;

const PA_PER_BAR = 100000;
const MIN_AIR_PA = 1;
const SQUEEZED_BELOW = 0.95;
const SPREADING_ABOVE = 1.1;
const FULL_LENGTH_CM = 1400;
const LENGTH_GROWTH = 0.6;
const LENGTH_GROWTH_END = 50;
const SPREAD_START_DEG = 3;
const SPREAD_PER_DECADE_DEG = 18;
const MAX_SPREAD_DEG = 60;
const PINCHED_WAIST = 0.82;
const PINCHED_RATIO = 0.85;
const DIAMOND_SPACING_DIAMETERS = 1.5;
const DIAMOND_RATIO_RANGE = [0.5, 6] as const;
const DIAMOND_FADE = [1.5, 5] as const;
const MAX_DIAMONDS = 8;

export interface PlumeShape {
  length: number;
  spreadDeg: number;
  waist: number;
  diamondSpacing: number;
  diamondStrength: number;
  diamondCount: number;
  brightness: number;
}

export function exitPressureBar(throttle: number): number {
  return EXIT_PRESSURE_BAR * throttle;
}

export function pressureRatio(throttle: number, airPa: number): number {
  return (exitPressureBar(throttle) * PA_PER_BAR) / Math.max(airPa, MIN_AIR_PA);
}

export function plumeState(ratio: number): PlumeState {
  if (ratio < SQUEEZED_BELOW) return 'squeezed';
  if (ratio <= SPREADING_ABOVE) return 'matched';
  return 'spreading';
}

function spreadDeg(ratio: number): number {
  if (ratio <= 1) return 0;
  return Math.min(MAX_SPREAD_DEG, SPREAD_START_DEG + SPREAD_PER_DECADE_DEG * Math.log10(ratio));
}

function waist(ratio: number): number {
  const share = smoothstep(ratio, PINCHED_RATIO, 1);
  return PINCHED_WAIST + (1 - PINCHED_WAIST) * share;
}

function diamondSpacing(ratio: number): number {
  const diameter = 2 * NOZZLE_EXIT.radius;
  return DIAMOND_SPACING_DIAMETERS * diameter * Math.sqrt(clamp(ratio, ...DIAMOND_RATIO_RANGE));
}

export function plumeShape(throttle: number, airPa: number): PlumeShape {
  const on = throttle > 0 ? 1 : 0;
  const ratio = pressureRatio(throttle, airPa);
  const length =
    FULL_LENGTH_CM * throttle * (1 + LENGTH_GROWTH * smoothstep(ratio, 1, LENGTH_GROWTH_END));
  const spacing = diamondSpacing(ratio);
  const strength = (1 - smoothstep(ratio, ...DIAMOND_FADE)) * on;
  return {
    length,
    spreadDeg: spreadDeg(ratio),
    waist: waist(ratio),
    diamondSpacing: spacing,
    diamondStrength: strength,
    diamondCount: Math.min(MAX_DIAMONDS, Math.floor(length / spacing)),
    brightness: throttle,
  };
}
