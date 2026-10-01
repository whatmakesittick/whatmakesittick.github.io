import { describe, expect, it } from 'vitest';
import { CYCLE_DISTANCES, metresInOneCycle } from './comparisons';
import { BLINK_MS, CYCLE_MS } from './constants';

describe('one cycle compared', () => {
  it('fits inside the quickest blink', () => {
    expect(CYCLE_MS).toBeLessThanOrEqual(BLINK_MS.min);
  });

  it('lets sound cover about 34 m and a car at 100 km/h about 2.8 m', () => {
    expect(CYCLE_DISTANCES.sound).toBeCloseTo(34.3, 6);
    expect(CYCLE_DISTANCES.car).toBeCloseTo(2.78, 6);
    expect(metresInOneCycle(715)).toBeCloseTo(71.5, 6);
  });
});
