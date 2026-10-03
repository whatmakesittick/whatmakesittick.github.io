import { clamp, toRadians } from '@core/math';
import type { HullMode, PlaningReading } from '../ids';
import { valueAt } from './keyframes';
import type { Keyframes } from './keyframes';
import { BOAT } from './layout';
import { FEET_PER_METRE, GRAVITY, knotsToMs } from './scale';

export const HULL_SPEED_KN = 5.7;
export const FLOATING_BELOW_KN = 6;
export const PLANING_FROM_KN = 16;
export const HUMP_PEAK_KN = 11;
export const SAVITSKY_BEAM = 1.5;

const SAVITSKY_SPEED_TERM = 0.012;
const SAVITSKY_BUOYANCY_TERM = 0.0055;
const SAVITSKY_SPEED_POWER = 0.5;
const SAVITSKY_BUOYANCY_POWER = 2.5;
const CV_VALID_FROM = 0.6;
const KEEL_TRIM_FROM = toRadians(1);
const MEAN_TO_SUM = 2;

export const TRIM_KEYS_DEG: Keyframes = [
  [0, 0],
  [4, 0.4],
  [5.7, 1.2],
  [8, 3.5],
  [11, 6],
  [13, 5.2],
  [15, 4],
  [22, 4],
  [30, 3],
  [42, 2.5],
];

export const WETTED_KEYS: Keyframes = [
  [0, 5.1],
  [5.7, 5.1],
  [8, 4.8],
  [11, 4.4],
  [13, 4.4],
  [15, 4.5],
  [22, 3.2],
  [30, 2.8],
  [42, 1.7],
];

export const TRANSOM_DEPTH_KEYS: Keyframes = [
  [0, 0.32],
  [4, 0.33],
  [5.7, 0.35],
  [8, 0.42],
  [11, 0.46],
  [13, 0.42],
  [15, 0.37],
  [22, 0.31],
  [30, 0.23],
  [42, 0.16],
];

export function modeAt(knots: number): HullMode {
  if (knots < FLOATING_BELOW_KN) return 'floating';
  if (knots < PLANING_FROM_KN) return 'hump';
  return 'planing';
}

export function beamFroude(knots: number): number {
  return knotsToMs(knots) / Math.sqrt(GRAVITY * SAVITSKY_BEAM);
}

function savitskySplit(lambda: number, cv: number): number {
  const speedTerm = SAVITSKY_SPEED_TERM * lambda ** SAVITSKY_SPEED_POWER;
  const buoyancyTerm = (SAVITSKY_BUOYANCY_TERM * lambda ** SAVITSKY_BUOYANCY_POWER) / (cv * cv);
  return speedTerm / (speedTerm + buoyancyTerm);
}

export function liftShareAt(knots: number, wettedLength: number): number {
  const lambda = wettedLength / SAVITSKY_BEAM;
  const cv = beamFroude(Math.max(knots, 0));
  if (cv >= CV_VALID_FROM) return savitskySplit(lambda, cv);
  return savitskySplit(lambda, CV_VALID_FROM) * (cv / CV_VALID_FROM);
}

export function heaveFor(trim: number, transomDepth: number): number {
  return BOAT.halfLength * Math.sin(trim) + BOAT.staticDraft * Math.cos(trim) - transomDepth;
}

export function keelWettedFor(trim: number, transomDepth: number): number {
  if (trim < KEEL_TRIM_FROM) return BOAT.waterlineLength;
  return Math.min(BOAT.waterlineLength, transomDepth / Math.sin(trim));
}

export function speedLengthRatio(knots: number): number {
  return knots / Math.sqrt(BOAT.length * FEET_PER_METRE);
}

export function planingAt(knots: number): PlaningReading {
  const speed = clamp(knots, 0, BOAT.topKnots);
  const trim = toRadians(valueAt(TRIM_KEYS_DEG, speed));
  const transomDepth = valueAt(TRANSOM_DEPTH_KEYS, speed);
  const wettedLength = valueAt(WETTED_KEYS, speed);
  const keelWettedLength = keelWettedFor(trim, transomDepth);
  return {
    knots: speed,
    mode: modeAt(speed),
    trim,
    heave: heaveFor(trim, transomDepth),
    transomDepth,
    wettedLength,
    keelWettedLength,
    chineWettedLength: clamp(MEAN_TO_SUM * wettedLength - keelWettedLength, 0, keelWettedLength),
    liftShare: liftShareAt(speed, wettedLength),
    speedLengthRatio: speedLengthRatio(speed),
  };
}
