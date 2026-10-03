import { describe, expect, it } from 'vitest';
import { METRES_PER_UNIT, knotsToKmh, knotsToMs, metresToUnits, msToKmh, msToKnots } from './scale';

describe('scale', () => {
  it('draws everything at one metre per unit', () => {
    expect(METRES_PER_UNIT).toBe(1);
    expect(metresToUnits(5.5)).toBe(5.5);
  });

  it('converts the facts sheet speeds', () => {
    expect(knotsToKmh(42)).toBeCloseTo(77.8, 1);
    expect(knotsToKmh(22)).toBeCloseTo(40.7, 1);
    expect(knotsToMs(42)).toBeCloseTo(21.6, 1);
    expect(knotsToMs(22)).toBeCloseTo(11.3, 1);
    expect(msToKnots(knotsToMs(5.7))).toBeCloseTo(5.7, 9);
    expect(msToKmh(knotsToMs(42))).toBeCloseTo(knotsToKmh(42), 9);
  });
});
