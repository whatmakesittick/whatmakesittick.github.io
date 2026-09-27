import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { localRegions, regionFromSpec } from './regions';
import type { RegionSpec } from './regions';

const DESK: RegionSpec = { x: [-2, 2], y: [0, 1], z: [-1, 3] };
const LAMP: RegionSpec = { x: [1, 2], y: [1, 4], z: [0, 1] };
const LIFT = new Vector3(0, 10, 0);
const SCALE = 2;

describe('regionFromSpec', () => {
  it('spans the extent on every axis', () => {
    const box = regionFromSpec(DESK);
    expect(box.min.toArray()).toEqual([-2, 0, -1]);
    expect(box.max.toArray()).toEqual([2, 1, 3]);
  });
});

describe('localRegions', () => {
  const region = localRegions({ desk: DESK, lamp: LAMP });

  it('looks a region up by id in local space', () => {
    expect(region('lamp').equals(regionFromSpec(LAMP))).toBe(true);
  });

  it('moves a region into the space of its root', () => {
    const root = new Matrix4().makeTranslation(LIFT).scale(new Vector3(SCALE, SCALE, SCALE));
    const box = region('desk', root);
    expect(box.min.toArray()).toEqual([-4, 10, -2]);
    expect(box.max.toArray()).toEqual([4, 12, 6]);
  });

  it('hands out a fresh box on every call', () => {
    const first = region('desk');
    first.expandByScalar(1);
    expect(region('desk').equals(regionFromSpec(DESK))).toBe(true);
  });
});
