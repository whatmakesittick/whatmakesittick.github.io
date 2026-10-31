import { describe, expect, it } from 'vitest';
import { DISTANCE_IDS } from '../ids';
import { DISTANCE_KM, hallPathUs, roundTripMs } from './network';

describe('network times', () => {
  it('places the user 100 or 1,000 km away', () => {
    expect(Object.keys(DISTANCE_KM)).toEqual([...DISTANCE_IDS]);
    expect(DISTANCE_KM).toEqual({ km100: 100, km1000: 1000 });
  });

  it('takes 0.98 ms there and back over 100 km and 9.8 ms over 1,000 km', () => {
    expect(roundTripMs(DISTANCE_KM.km100)).toBeCloseTo(0.98, 9);
    expect(roundTripMs(DISTANCE_KM.km1000)).toBeCloseTo(9.8, 9);
  });

  it('crosses the hall through three switches and 100 m of fibre in about 2.6 µs', () => {
    expect(hallPathUs()).toBeCloseTo(2.59, 9);
    expect(hallPathUs().toFixed(1)).toBe('2.6');
  });
});
