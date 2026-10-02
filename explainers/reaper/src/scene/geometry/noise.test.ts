import { describe, expect, it } from 'vitest';
import { fractalNoise, hash2, valueNoise } from './noise';

describe('noise', () => {
  it('stays between zero and one', () => {
    for (let index = 0; index < 50; index += 1) {
      const value = fractalNoise(index * 0.37, index * 0.91, 4, 3);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      expect(hash2(index, 2)).toBeLessThan(1);
    }
  });

  it('repeats over its period', () => {
    expect(valueNoise(0.3, 1.7, 5, 4)).toBeCloseTo(valueNoise(4.3, 1.7, 5, 4));
    expect(fractalNoise(0.3, 2.2, 3, 1, 4)).toBeCloseTo(fractalNoise(4.3, 2.2, 3, 1, 4));
  });
});
