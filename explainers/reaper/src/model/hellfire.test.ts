import { describe, expect, it } from 'vitest';
import { TARGET_RANGE_KM, flightSeconds } from './hellfire';

describe('Hellfire flight time', () => {
  it('takes 18 to 27 s over 8 km', () => {
    const { fast, slow } = flightSeconds(8);
    expect(Math.round(fast)).toBe(18);
    expect(Math.round(slow)).toBe(27);
  });

  it('grows with the range', () => {
    expect(flightSeconds(11).slow).toBeCloseTo(36.67, 2);
    expect(flightSeconds(11).fast).toBeCloseTo(24.44, 2);
  });

  it('starts at the 8 km a missile covers from the cruise altitude and reaches 11 km', () => {
    expect(TARGET_RANGE_KM).toEqual({ min: 8, max: 11, step: 0.5, default: 8 });
  });
});
