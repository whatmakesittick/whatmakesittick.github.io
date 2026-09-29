import { FULL_TURN, smoothstep } from '@core/math';
import { airPressure } from './atmosphere';
import { inverseMonotone, linearCurve, monotoneCurve } from './curve';
import type { CurveKey } from './curve';

export const START_LEAD = 3;
export const CUTOFF_TIME = 140;
export const END_TIME = 142;
export const RUN_LENGTH = END_TIME + START_LEAD;
export const MAX_Q_TIME = 52;

export const START_SEQUENCE = {
  spinStart: -3,
  preburnerLight: -2.2,
  chamberLight: -1.9,
  fullThrust: -0.4,
} as const;

export const ALTITUDE_KEYS: readonly CurveKey[] = [
  [0, 0],
  [10, 0.15],
  [20, 0.7],
  [30, 1.65],
  [60, 8.4],
  [90, 19.9],
  [120, 37.4],
  [140, 52],
];

export const SPEED_KEYS: readonly CurveKey[] = [
  [0, 0],
  [10, 100],
  [20, 290],
  [30, 520],
  [60, 1300],
  [90, 2600],
  [120, 4650],
  [140, 5800],
];

export const THROTTLE_KEYS: readonly CurveKey[] = [
  [START_SEQUENCE.chamberLight, 0],
  [START_SEQUENCE.fullThrust, 1],
  [42, 1],
  [47, 0.8],
  [60, 0.8],
  [68, 1],
  [128, 1],
  [136, 0.75],
  [139.4, 0.75],
  [CUTOFF_TIME, 0],
];

export const GIMBAL_PITCH_KEYS: readonly CurveKey[] = [
  [0, 0],
  [8, 0],
  [12, 1.5],
  [20, 0.8],
  [45, -1.2],
  [60, 0.5],
  [90, -0.6],
  [120, 0.4],
  [CUTOFF_TIME, 0],
];

const IDLE_SPIN = 0.2;
const SPIN_DOWN_SECONDS = 2;
const PREBURNER_EASE_SECONDS = 0.3;
const PREBURNER_FADE_SECONDS = 0.5;
const PREBURNER_BASE = 0.4;
const CHAMBER_EASE_SECONDS = 0.3;
const CHAMBER_FADE_SECONDS = 1;
const CHAMBER_BASE = 0.25;
const YAW_AMPLITUDE_DEG = 0.3;
const YAW_PERIOD_SECONDS = 23;
const YAW_SETTLE_SECONDS = 4;

const altitudeCurve = monotoneCurve(ALTITUDE_KEYS);
const speedCurve = monotoneCurve(SPEED_KEYS);
const throttleCurve = linearCurve(THROTTLE_KEYS);
const pitchCurve = monotoneCurve(GIMBAL_PITCH_KEYS);

export interface Gimbal {
  pitch: number;
  yaw: number;
}

export interface EngineState {
  time: number;
  throttle: number;
  spin: number;
  preburnerGlow: number;
  chamberGlow: number;
  running: boolean;
  gimbal: Gimbal;
  altitudeKm: number;
  speedKmh: number;
  airPressurePa: number;
}

export function flightTime(phase: number): number {
  return phase - START_LEAD;
}

export function phaseAt(time: number): number {
  return time + START_LEAD;
}

export function throttle(time: number): number {
  return throttleCurve(time);
}

export function altitudeKm(time: number): number {
  return altitudeCurve(time);
}

export function speedKmh(time: number): number {
  return speedCurve(time);
}

export function isRunning(time: number): boolean {
  return time >= START_SEQUENCE.chamberLight && time < CUTOFF_TIME;
}

export function spin(time: number): number {
  const { spinStart, preburnerLight } = START_SEQUENCE;
  if (time < spinStart) return 0;
  if (time < preburnerLight) return (IDLE_SPIN * (time - spinStart)) / (preburnerLight - spinStart);
  const running = IDLE_SPIN + (1 - IDLE_SPIN) * throttle(time);
  if (time <= CUTOFF_TIME) return running;
  return running * (1 - smoothstep(time, CUTOFF_TIME, CUTOFF_TIME + SPIN_DOWN_SECONDS));
}

function glow(time: number, light: number, ease: number, fade: number, base: number): number {
  const lit = smoothstep(time, light, light + ease);
  const level = base + (1 - base) * throttle(time);
  const cooling = 1 - smoothstep(time, CUTOFF_TIME, CUTOFF_TIME + fade);
  return lit * level * cooling;
}

export function preburnerGlow(time: number): number {
  return glow(
    time,
    START_SEQUENCE.preburnerLight,
    PREBURNER_EASE_SECONDS,
    PREBURNER_FADE_SECONDS,
    PREBURNER_BASE,
  );
}

export function chamberGlow(time: number): number {
  return glow(
    time,
    START_SEQUENCE.chamberLight,
    CHAMBER_EASE_SECONDS,
    CHAMBER_FADE_SECONDS,
    CHAMBER_BASE,
  );
}

export function gimbal(time: number): Gimbal {
  if (time <= 0 || time >= CUTOFF_TIME) return { pitch: 0, yaw: 0 };
  const settle = 1 - smoothstep(time, CUTOFF_TIME - YAW_SETTLE_SECONDS, CUTOFF_TIME);
  const yaw = YAW_AMPLITUDE_DEG * Math.sin((FULL_TURN * time) / YAW_PERIOD_SECONDS) * settle;
  return { pitch: pitchCurve(time), yaw };
}

export function engineState(phase: number): EngineState {
  const time = flightTime(phase);
  const altitude = altitudeKm(time);
  return {
    time,
    throttle: throttle(time),
    spin: spin(time),
    preburnerGlow: preburnerGlow(time),
    chamberGlow: chamberGlow(time),
    running: isRunning(time),
    gimbal: gimbal(time),
    altitudeKm: altitude,
    speedKmh: speedKmh(time),
    airPressurePa: airPressure(altitude),
  };
}

export function phaseAtAltitude(km: number): number {
  return phaseAt(inverseMonotone(altitudeCurve, km, [0, CUTOFF_TIME]));
}
