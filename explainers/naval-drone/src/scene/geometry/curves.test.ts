import { describe, expect, it } from 'vitest';
import { mergeSorted, monotoneCubic, spread } from './curves';

describe('curves', () => {
  it('passes through the knots and stays monotone between them', () => {
    const curve = monotoneCubic([0, 1, 2, 3], [0, 0, 1, 3]);
    expect(curve(1)).toBe(0);
    expect(curve(2)).toBe(1);
    for (let x = 0; x < 3; x += 0.05)
      expect(curve(x + 0.05)).toBeGreaterThanOrEqual(curve(x) - 1e-12);
    expect(curve(-1)).toBe(0);
    expect(curve(9)).toBe(3);
  });

  it('spreads and merges sample positions', () => {
    expect(spread(0, 1, 4)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(mergeSorted([0.3, 0.1, 0.1001, 0.2], 0.001)).toEqual([0.1, 0.2, 0.3]);
  });
});
