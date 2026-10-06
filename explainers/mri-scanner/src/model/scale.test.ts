import { describe, expect, it } from 'vitest';
import { BORE } from './layout';
import { METRES_PER_UNIT, metresToCentimetres, metresToUnits } from './scale';

describe('scale', () => {
  it('draws the machine at one metre per unit', () => {
    expect(METRES_PER_UNIT).toBe(1);
    expect(metresToUnits(1.7)).toBe(1.7);
  });

  it('turns the bore radius into a 70 cm tunnel', () => {
    expect(metresToCentimetres(2 * BORE.radius)).toBeCloseTo(70, 9);
  });
});
