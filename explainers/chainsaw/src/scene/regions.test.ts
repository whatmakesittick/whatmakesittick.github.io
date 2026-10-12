import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { REGION_BOUNDS } from '../model';
import { CYLINDER } from './constants';
import { regionBox } from './regions';

const LIFT = 0.16;

describe('regions', () => {
  it('frames the cylinder tighter than its model bounds, head to crank', () => {
    const box = regionBox('cylinder', 0);
    const size = box.getSize(new Vector3());
    const { min, max } = REGION_BOUNDS.cylinder;
    expect(size.y).toBeLessThan(max[1] - min[1]);
    expect(box.min.y).toBeLessThan(CYLINDER.base);
    expect(box.max.y).toBeGreaterThan(CYLINDER.headTop);
    expect(box.max.x).toBeGreaterThan(CYLINDER.finOuter);
  });

  it('lifts every region with the saw', () => {
    const { min } = REGION_BOUNDS.bar;
    expect(regionBox('bar', LIFT).min.y).toBeCloseTo(min[1] + LIFT, 9);
  });
});
