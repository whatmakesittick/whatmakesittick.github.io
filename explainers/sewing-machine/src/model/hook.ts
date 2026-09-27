import { toRadians } from '@core/math';
import { wrapPhase } from '@core/store';
import { STITCH_CYCLE } from './cycle';
import { NEEDLE, needleEyeHeight } from './needle';

export const HOOK = {
  turnsPerStitch: 2,
  catchAngle: 205,
  axisOffset: 12,
  pointRadius: 13,
} as const;

export const HOOK_POINT_HEIGHT = needleEyeHeight(HOOK.catchAngle) + NEEDLE.scarfAboveEye;

export const BOBBIN_CASE = {
  radius: 10.8,
  top: -3.2,
  bottom: -12,
} as const;

export interface PlanPoint {
  x: number;
  z: number;
}

export function hookRotation(angle: number): number {
  return HOOK.turnsPerStitch * (angle - HOOK.catchAngle);
}

export function hookAngle(angle: number): number {
  return wrapPhase(hookRotation(angle), STITCH_CYCLE);
}

export function hookPlanPoint(hookDegrees: number, radius: number): PlanPoint {
  const radians = toRadians(hookDegrees);
  return { x: -radius * Math.sin(radians), z: HOOK.axisOffset - radius * Math.cos(radians) };
}
