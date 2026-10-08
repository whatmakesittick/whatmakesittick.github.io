import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SUBSTATION, collectorRoutes, terrainHeight, windArrowsX } from '../model';
import { farmRegions } from './regions';

const SPACING = 7;

describe('farm regions', () => {
  const regions = farmRegions(SPACING);

  it('centres the grid region on the substation where the cables converge', () => {
    const centre = regions.grid.getCenter(new Vector3());
    expect(centre.x).toBeCloseTo(SUBSTATION.x);
    expect(centre.z).toBeCloseTo(SUBSTATION.z);
    collectorRoutes(SPACING).forEach((route) => {
      const [x, z] = route[route.length - 1];
      expect(regions.grid.containsPoint(new Vector3(x, terrainHeight(x, z), z))).toBe(true);
    });
  });

  it('keeps the grid region much tighter than the farm', () => {
    const grid = regions.grid.getSize(new Vector3());
    const farm = regions.farm.getSize(new Vector3());
    expect(grid.x).toBeLessThan(farm.x);
    expect(grid.z).toBeLessThan(farm.z / 2);
  });

  it('holds the substation in the farm and the upwind arrows in the wakes', () => {
    expect(regions.farm.max.x).toBeGreaterThanOrEqual(SUBSTATION.x);
    expect(regions.farm.max.z).toBeGreaterThanOrEqual(SUBSTATION.z);
    expect(regions.wakes.min.x).toBeLessThanOrEqual(windArrowsX(SPACING));
  });
});
