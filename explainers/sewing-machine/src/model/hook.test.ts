import { describe, expect, it } from 'vitest';
import { PLATE_BOTTOM } from './fabric';
import {
  BOBBIN_CASE,
  HOOK,
  HOOK_POINT_HEIGHT,
  hookAngle,
  hookPlanPoint,
  hookRotation,
} from './hook';
import { NEEDLE, needleEyeHeight, needleTipHeight } from './needle';

const PRECISION = 6;
const CATCH = 205;
const OTHER_PASS = CATCH - 180;

describe('hook timing', () => {
  it('brings the point to the needle at 205°', () => {
    expect(HOOK.catchAngle).toBe(CATCH);
    expect(hookAngle(CATCH)).toBe(0);
    const point = hookPlanPoint(hookAngle(CATCH), HOOK.pointRadius);
    expect(point.x).toBeCloseTo(0, PRECISION);
    expect(point.z).toBeLessThan(-NEEDLE.radius);
    expect(point.z).toBeGreaterThan(-2 * NEEDLE.radius);
  });

  it('turns twice for every turn of the handwheel', () => {
    expect(hookRotation(360) - hookRotation(0)).toBe(2 * 360);
    expect(hookAngle(CATCH + 90)).toBe(180);
  });

  it('passes the needle twice but only catches a loop once', () => {
    expect(hookAngle(OTHER_PASS)).toBe(0);
    expect(needleEyeHeight(CATCH)).toBeLessThan(PLATE_BOTTOM);
    expect(needleTipHeight(OTHER_PASS)).toBeGreaterThan(0);
  });

  it('meets the needle just above the eye, at the scarf', () => {
    expect(HOOK_POINT_HEIGHT - needleEyeHeight(CATCH)).toBeCloseTo(NEEDLE.scarfAboveEye, PRECISION);
    expect(HOOK_POINT_HEIGHT).toBeLessThan(BOBBIN_CASE.top);
    expect(HOOK_POINT_HEIGHT).toBeGreaterThan(BOBBIN_CASE.bottom);
  });

  it('meets the needle once it has risen about 2 mm from the bottom', () => {
    expect(needleTipHeight(CATCH) - needleTipHeight(180)).toBeCloseTo(2, 0);
  });

  it('keeps the point outside the bobbin case', () => {
    expect(HOOK.pointRadius).toBeGreaterThan(BOBBIN_CASE.radius);
    expect(HOOK.pointRadius).toBeGreaterThan(HOOK.axisOffset + NEEDLE.radius);
  });
});
