import { describe, expect, it } from 'vitest';
import { fittedOutline, resample } from './fitted';
import { bottomYAt } from './hullLines';

describe('fitted boxes', () => {
  it('lifts the floor onto the hull bottom and keeps the box top', () => {
    const outline = fittedOutline(
      { x: [0, 1], z: () => [-0.4, 0.4], y: [-0.2, 0.3], clearance: 0.02 },
      0,
    );
    expect(outline[0]).toEqual([0.4, 0.3]);
    const floor = outline.slice(2);
    floor.forEach(([z, y]) => expect(y).toBeGreaterThanOrEqual(bottomYAt(0, z) + 0.02 - 1e-9));
    expect(floor.some(([z]) => z === 0)).toBe(true);
  });

  it('resamples a loop evenly by length', () => {
    const square = resample(
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      8,
    );
    expect(square).toHaveLength(8);
    expect(square[2][0]).toBeCloseTo(1, 9);
    expect(square[2][1]).toBeCloseTo(0, 9);
    expect(square[1][0]).toBeCloseTo(0.5, 9);
  });
});
