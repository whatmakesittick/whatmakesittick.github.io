import { describe, expect, it } from 'vitest';
import { firstCrossing, integralTo, valueAt } from './keyframes';
import type { Keyframes } from './keyframes';

const RAMP: Keyframes = [
  [0, 0],
  [10, 10],
  [20, 10],
];

describe('keyframes', () => {
  it('interpolates between keys and holds the ends', () => {
    expect(valueAt(RAMP, -5)).toBe(0);
    expect(valueAt(RAMP, 5)).toBe(5);
    expect(valueAt(RAMP, 15)).toBe(10);
    expect(valueAt(RAMP, 25)).toBe(10);
  });

  it('integrates the area under the keys exactly', () => {
    expect(integralTo(RAMP, 0)).toBe(0);
    expect(integralTo(RAMP, 5)).toBeCloseTo(12.5, 9);
    expect(integralTo(RAMP, 10)).toBeCloseTo(50, 9);
    expect(integralTo(RAMP, 20)).toBeCloseTo(150, 9);
    expect(integralTo(RAMP, 99)).toBeCloseTo(150, 9);
  });

  it('finds the first time a value is reached', () => {
    expect(firstCrossing(RAMP, 0)).toBe(0);
    expect(firstCrossing(RAMP, 4)).toBeCloseTo(4, 9);
    expect(firstCrossing(RAMP, 10)).toBe(10);
    expect(firstCrossing(RAMP, 11)).toBeNaN();
  });
});
