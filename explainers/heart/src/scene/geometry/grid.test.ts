import { describe, expect, it } from 'vitest';
import { cubeAround } from './grid';

describe('grid cube', () => {
  it('encloses the bounds with a margin on every side', () => {
    const cube = cubeAround({ min: [-10, -40, -5], max: [30, 20, 5] }, 8, 64);
    for (let axis = 0; axis < 3; axis += 1) {
      const low = cube.centre[axis] - cube.halfSize;
      const high = cube.centre[axis] + cube.halfSize;
      expect(low).toBeLessThanOrEqual([-10, -40, -5][axis] - 8);
      expect(high).toBeGreaterThanOrEqual([30, 20, 5][axis] + 8);
    }
    expect(cube.resolution).toBe(64);
  });
});
