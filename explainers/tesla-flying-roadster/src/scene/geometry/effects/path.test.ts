import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { cumulativeLengths, evenlySpaced } from './path';

const BENT = [new Vector3(0, 0, 0), new Vector3(3, 0, 0), new Vector3(3, 4, 0)];

describe('path spacing', () => {
  it('measures the running length of a path', () => {
    expect(cumulativeLengths(BENT)).toEqual([0, 3, 7]);
  });

  it('places points at even steps along the path, keeping both ends', () => {
    const points = evenlySpaced(BENT, 1);
    expect(points).toHaveLength(8);
    expect(points[0].toArray()).toEqual([0, 0, 0]);
    expect(points[7].toArray()).toEqual([3, 4, 0]);
    points.slice(1).forEach((point, index) => {
      const step = point.distanceTo(points[index]);
      expect(step).toBeLessThanOrEqual(1 + 1e-9);
    });
    expect(points[5].toArray()).toEqual([3, 2, 0]);
  });
});
