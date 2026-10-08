import { describe, expect, it } from 'vitest';
import {
  COLUMN_COUNT,
  HERO_SITE,
  ROW_COUNT,
  SUBSTATION,
  collectorRoutes,
  farmLayout,
  terrainHeight,
} from './layout';

const MAX_TERRAIN_M = 27;

describe('farmLayout', () => {
  it('places 27 turbines in three rows along the wind', () => {
    const sites = farmLayout(7);
    expect(sites).toHaveLength(27);
    expect(ROW_COUNT * COLUMN_COUNT).toBe(27);
    sites.forEach((site) => {
      expect(site.x).toBe([-1050, 0, 1050][site.row]);
    });
  });

  it('staggers the middle row against the outer rows', () => {
    farmLayout(7).forEach((site) => {
      const stagger = site.row === 1 ? 150 : -150;
      expect(site.z).toBe((site.column - 4) * 600 + stagger);
    });
  });

  it('puts the hero turbine in the middle of the front row', () => {
    expect(HERO_SITE).toBe(4);
    expect(farmLayout(7)[HERO_SITE]).toEqual({ row: 0, column: 4, x: -1050, z: -150 });
  });

  it('moves the outer rows with the spacing', () => {
    const outerX = (spacing: 5 | 9) =>
      farmLayout(spacing)
        .filter((site) => site.row !== 1)
        .map((site) => site.x);
    expect(new Set(outerX(5))).toEqual(new Set([-750, 750]));
    expect(new Set(outerX(9))).toEqual(new Set([-1350, 1350]));
  });
});

describe('collectorRoutes', () => {
  it('runs one cable per row along the turbines to the substation', () => {
    const routes = collectorRoutes(7);
    expect(routes).toHaveLength(3);
    routes.forEach((route) => {
      expect(route).toHaveLength(10);
      const turbines = route.slice(0, -1);
      turbines.slice(1).forEach(([, z], index) => {
        expect(z).toBeGreaterThan(turbines[index][1]);
      });
      expect(route[route.length - 1]).toEqual([SUBSTATION.x, SUBSTATION.z]);
      expect(route[route.length - 1]).toEqual([2200, 3000]);
    });
  });
});

describe('terrainHeight', () => {
  it('keeps the hills within 27 m of the base level', () => {
    for (let x = -4000; x <= 6000; x += 250) {
      for (let z = -5000; z <= 5000; z += 250) {
        expect(Math.abs(terrainHeight(x, z))).toBeLessThanOrEqual(MAX_TERRAIN_M);
      }
    }
  });
});
