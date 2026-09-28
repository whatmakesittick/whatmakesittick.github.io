import { describe, expect, it } from 'vitest';
import { DEPTHS_TO_FULL_BLUR, FOCUS, blurShare, clampFocus, defocus } from './focus';

describe('focus', () => {
  it('moves the stage 20 µm either way in 1 µm steps', () => {
    expect(FOCUS).toEqual({ min: -20, max: 20, step: 1, default: 0 });
    expect(clampFocus(35)).toBe(20);
    expect(clampFocus(-35)).toBe(-20);
  });

  it('stays sharp while the specimen is within the depth of field', () => {
    expect(defocus(4, 8.5)).toBe(0);
    expect(defocus(-4, 8.5)).toBe(0);
    expect(blurShare(4, 8.5)).toBe(0);
  });

  it('blurs by how far the specimen is outside the depth of field', () => {
    expect(defocus(10, 8.5)).toBeCloseTo(5.75, 9);
    expect(blurShare(10, 8.5)).toBeCloseTo(5.75 / (8.5 * DEPTHS_TO_FULL_BLUR), 9);
    expect(blurShare(-10, 8.5)).toBeCloseTo(blurShare(10, 8.5), 9);
  });

  it('blurs far sooner at high power', () => {
    expect(blurShare(2, 0.7)).toBeGreaterThan(blurShare(20, 8.5));
    expect(blurShare(20, 0.7)).toBe(1);
  });
});
