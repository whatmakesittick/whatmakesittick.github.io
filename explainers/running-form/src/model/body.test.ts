import { describe, expect, it } from 'vitest';
import { BODY_TARGET_CM, HEIGHT_M, LEG_CHECK_M, SHANK_M, THIGH_M } from './body';

describe('body', () => {
  it('gives segment lengths that fit the leg length check', () => {
    expect(THIGH_M + SHANK_M).toBeLessThan(LEG_CHECK_M);
    expect(LEG_CHECK_M - (THIGH_M + SHANK_M)).toBeLessThan(0.05);
  });

  it('derives the segments from the shares of the height', () => {
    expect(THIGH_M).toBeCloseTo(0.245 * HEIGHT_M, 2);
    expect(SHANK_M).toBeCloseTo(0.246 * HEIGHT_M, 2);
  });

  it('derives the leg length from stature and sitting height', () => {
    expect((BODY_TARGET_CM.stature - BODY_TARGET_CM.sitting) / 100).toBeCloseTo(LEG_CHECK_M, 2);
  });
});
