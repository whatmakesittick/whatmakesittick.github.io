import { toRadians } from '@core/math';
import { GRAVITY, toMetresPerSecond } from './scale';

export const TILT_RANGE = { min: 0, max: 60, step: 1, default: 30 } as const;
export const SPRINT_KMH = 100;

export function accelerationAt(tiltDeg: number): number {
  return GRAVITY * Math.tan(toRadians(tiltDeg));
}

export function accelerationInG(tiltDeg: number): number {
  return accelerationAt(tiltDeg) / GRAVITY;
}

export function thrustShareAt(tiltDeg: number): number {
  return 1 / Math.cos(toRadians(tiltDeg));
}

export function secondsToKmh(tiltDeg: number, kmh: number): number {
  return toMetresPerSecond(kmh) / accelerationAt(tiltDeg);
}
