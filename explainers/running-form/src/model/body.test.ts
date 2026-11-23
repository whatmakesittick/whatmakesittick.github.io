import { describe, expect, it } from 'vitest';
import { BODY_TARGET_CM, HEIGHT_M, LEG_CHECK_M, SHANK_M, THIGH_M } from './body';

describe('body', () => {
  it('gives segment lengths that fit the leg length check', () => {
    expect(Math.abs(LEG_CHECK_M - (THIGH_M + SHANK_M))).toBeLessThan(0.05);
  });

  it('keeps the thigh and the shank near a quarter of the height each', () => {
    expect(THIGH_M / HEIGHT_M).toBeCloseTo(0.25, 1);
    expect(SHANK_M / HEIGHT_M).toBeCloseTo(0.25, 1);
  });

  it('derives the leg length from stature and sitting height', () => {
    expect((BODY_TARGET_CM.stature - BODY_TARGET_CM.sitting) / 100).toBeCloseTo(LEG_CHECK_M, 2);
  });
});
