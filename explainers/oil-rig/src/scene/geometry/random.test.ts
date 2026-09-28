import { describe, expect, it } from 'vitest';
import { seededRandom } from './random';

describe('seeded random', () => {
  it('repeats the same sequence for the same seed', () => {
    const first = seededRandom(7);
    const second = seededRandom(7);
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('stays between zero and one', () => {
    const random = seededRandom(3);
    for (let index = 0; index < 100; index++) {
      const value = random();
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
    }
  });
});
