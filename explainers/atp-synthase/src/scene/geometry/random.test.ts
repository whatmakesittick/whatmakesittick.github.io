import { describe, expect, it } from 'vitest';
import { between, seededRandom } from './random';

const DRAWS = 1000;

describe('seeded random', () => {
  it('repeats the same numbers for the same seed', () => {
    const first = seededRandom(7);
    const second = seededRandom(7);
    for (let draw = 0; draw < DRAWS; draw += 1) expect(first()).toBe(second());
  });

  it('stays in the unit range and spreads over it', () => {
    const random = seededRandom(42);
    const values = Array.from({ length: DRAWS }, random);
    values.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
    const mean = values.reduce((sum, value) => sum + value, 0) / DRAWS;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  it('draws between two bounds', () => {
    const random = seededRandom(3);
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const value = between(random, -2, 5);
      expect(value).toBeGreaterThanOrEqual(-2);
      expect(value).toBeLessThan(5);
    }
  });
});
