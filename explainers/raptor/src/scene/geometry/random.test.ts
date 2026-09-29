import { describe, expect, it } from 'vitest';
import { inDisc, seededRandom } from './random';

describe('seeded random', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    for (let step = 0; step < 10; step += 1) expect(a()).toBe(b());
  });

  it('stays in the unit interval and the unit disc', () => {
    const random = seededRandom(3);
    for (let step = 0; step < 500; step += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(Math.hypot(...inDisc(random))).toBeLessThanOrEqual(1);
    }
  });
});
