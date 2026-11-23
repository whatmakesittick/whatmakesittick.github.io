import type { PaceId } from '../ids';
import { toRadians } from '@core/math';
import { PELVIS_TILT_DEG, SHANK_M, THIGH_M } from './body';
import { legAnglesAt } from './legAngles';
import { CYCLE_UNITS } from './playback';

export interface Point2 {
  x: number;
  y: number;
}

export const FOOT_PATH_POINTS = 101;

export function ankleAgainstHip(units: number, pace: PaceId, stepRate: number): Point2 {
  const { hipFlexDeg, kneeFlexDeg } = legAnglesAt(units, pace, stepRate);
  const thigh = toRadians(hipFlexDeg - PELVIS_TILT_DEG);
  const shank = thigh - toRadians(kneeFlexDeg);
  return {
    x: THIGH_M * Math.sin(thigh) + SHANK_M * Math.sin(shank),
    y: -(THIGH_M * Math.cos(thigh) + SHANK_M * Math.cos(shank)),
  };
}

export function footPathAt(pace: PaceId, stepRate: number): Point2[] {
  return Array.from({ length: FOOT_PATH_POINTS }, (_, index) =>
    ankleAgainstHip((index * CYCLE_UNITS) / (FOOT_PATH_POINTS - 1), pace, stepRate),
  );
}

export function landingReachM(pace: PaceId, stepRate: number): number {
  return ankleAgainstHip(0, pace, stepRate).x;
}
