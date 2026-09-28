import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { ellipsoid } from './field';
import { spokes, wallBase } from './papillary';

describe('papillary muscles', () => {
  it('roots each muscle inside the wall behind its tip', () => {
    const cavity = ellipsoid([0, 0, 0], [20, 20, 20]);
    const base = wallBase(cavity, [0, -10, 0], [0, -1, 0], 1.5, 0.25);
    expect(base.y).toBeLessThan(-21);
    expect(base.y).toBeGreaterThan(-22.5);
  });

  it('spaces points evenly from base to tip', () => {
    const points = spokes(new Vector3(0, 0, 0), new Vector3(0, 10, 0), 5);
    expect(points).toHaveLength(6);
    expect(points[2].y).toBeCloseTo(4, 5);
  });
});
