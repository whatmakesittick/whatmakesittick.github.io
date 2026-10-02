import { describe, expect, it } from 'vitest';
import { TARGET_RANGE_KM, flightSeconds } from './hellfire';

describe('Hellfire flight time', () => {
  it('takes 18 to 27 s over 8 km', () => {
    const { fast, slow } = flightSeconds(8);
    expect(Math.round(fast)).toBe(18);
    expect(Math.round(slow)).toBe(27);
  });

  it('grows with the range', () => {
    expect(flightSeconds(2).slow).toBeCloseTo(6.67, 2);
    expect(flightSeconds(2).fast).toBeCloseTo(4.44, 2);
  });

  it('reaches out to the 8 km range', () => {
    expect(TARGET_RANGE_KM).toEqual({ min: 2, max: 8, step: 0.5, default: 8 });
  });
});
