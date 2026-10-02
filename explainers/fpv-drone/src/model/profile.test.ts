import { describe, expect, it } from 'vitest';
import { Profile } from './profile';

const RAMP = new Profile([
  [0, 0],
  [4, 8],
  [10, 8],
  [14, 0],
]);

describe('time profile', () => {
  it('holds the knot values and eases between them', () => {
    expect(RAMP.at(0)).toBe(0);
    expect(RAMP.at(4)).toBe(8);
    expect(RAMP.at(7)).toBe(8);
    expect(RAMP.at(2)).toBeCloseTo(4, 9);
    expect(RAMP.at(1)).toBeLessThan(2);
    expect(RAMP.at(3)).toBeGreaterThan(6);
    expect(RAMP.at(14)).toBe(0);
  });

  it('clamps outside the knots', () => {
    expect(RAMP.at(-3)).toBe(0);
    expect(RAMP.at(20)).toBe(0);
    expect(RAMP.slopeAt(-3)).toBe(0);
    expect(RAMP.integralTo(-3)).toBe(0);
    expect(RAMP.integralTo(20)).toBeCloseTo(RAMP.integralTo(14), 9);
  });

  it('has a zero slope at every knot and its steepest slope midway', () => {
    expect(RAMP.slopeAt(0)).toBe(0);
    expect(RAMP.slopeAt(4)).toBe(0);
    expect(RAMP.slopeAt(2)).toBeCloseTo(3, 9);
    expect(RAMP.slopeAt(12)).toBeCloseTo(-3, 9);
  });

  it('integrates each ramp to its mean value times its length', () => {
    expect(RAMP.integralTo(4)).toBeCloseTo(16, 9);
    expect(RAMP.integralTo(10)).toBeCloseTo(64, 9);
    expect(RAMP.integralTo(14)).toBeCloseTo(80, 9);
  });

  it('integrates a partial ramp like a fine sum would', () => {
    const steps = 20000;
    let sum = 0;
    for (let index = 0; index < steps; index += 1) {
      const time = ((index + 0.5) / steps) * 3;
      sum += (RAMP.at(time) * 3) / steps;
    }
    expect(RAMP.integralTo(3)).toBeCloseTo(sum, 5);
  });
});
