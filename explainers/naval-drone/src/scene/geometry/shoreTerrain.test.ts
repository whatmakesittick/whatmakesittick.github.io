import { describe, expect, it } from 'vitest';
import { Color } from 'three';
import { GROUND_STATION, SLIPWAY } from '../../model/layout';
import {
  SLAB_THICKNESS,
  gridLines,
  terrainGrid,
  naturalHeight,
  shoreColour,
  shoreHeight,
  shorelineX,
  slabTop,
} from './shoreTerrain';

const grid = terrainGrid();
const EDGE = 0.02;

describe('shore terrain', () => {
  it('meets the sea at the shoreline near the slipway', () => {
    expect(shorelineX(0)).toBe(0);
    expect(naturalHeight(-0.01, 30)).toBeCloseTo(0, 2);
    expect(naturalHeight(15, 30)).toBeLessThan(0);
    expect(naturalHeight(-15, 30)).toBeGreaterThan(0);
  });

  it('shelves to about six metres deep eighty metres out', () => {
    expect(naturalHeight(80, 30)).toBeCloseTo(-6, 1);
  });

  it('keeps the dunes low', () => {
    for (let z = -400; z <= 400; z += 37) {
      expect(naturalHeight(-80, z)).toBeLessThan(10);
    }
  });

  it('runs the slab top from the apron down to the foot', () => {
    expect(slabTop(SLIPWAY.x[0])).toBeCloseTo(SLIPWAY.top, 9);
    expect(slabTop(SLIPWAY.x[1])).toBeCloseTo(SLIPWAY.foot, 9);
    expect(slabTop(-40)).toBeCloseTo(SLIPWAY.top, 9);
  });

  it('keeps the terrain under the slab and below its top at the edges', () => {
    for (let x = -27.5; x <= 2.5; x += 0.5) {
      const top = slabTop(x);
      expect(shoreHeight(x, 0)).toBeLessThan(top - SLAB_THICKNESS);
      expect(shoreHeight(x, SLIPWAY.z[1] + EDGE)).toBeLessThan(top);
    }
  });

  it('keeps every mesh vertex on and beside the ramp below the slab top', () => {
    const { xs, zs, heights } = grid;
    zs.forEach((z, row) =>
      xs.forEach((x, column) => {
        const onRamp = x >= SLIPWAY.x[0] && x <= SLIPWAY.x[1] && Math.abs(z) <= SLIPWAY.z[1] + EDGE;
        if (onRamp) expect(heights[row * xs.length + column]).toBeLessThan(slabTop(x));
      }),
    );
  });

  it('flattens the ground station pad', () => {
    const [x, level, z] = GROUND_STATION;
    expect(shoreHeight(x, z)).toBeCloseTo(level, 6);
    expect(shoreHeight(x + 12, z - 8)).toBeCloseTo(level, 6);
  });

  it('builds sorted lines that keep the break lines', () => {
    const lines = gridLines([-100, 100], [-10, 10], [1.5, 1.5], [2.02, 1.6]);
    expect(lines[0]).toBe(-100);
    expect(lines[lines.length - 1]).toBe(100);
    expect(lines).toContain(2.02);
    expect(lines).toContain(1.6);
    expect(lines.filter((line) => Math.abs(line - 2) < 0.5)).toEqual([1.6, 2.02]);
    lines.slice(1).forEach((line, index) => expect(line).toBeGreaterThan(lines[index]));
  });

  it('keeps the grid within the triangle budget', () => {
    const cells = (grid.xs.length - 1) * (grid.zs.length - 1);
    expect(cells * 2).toBeLessThan(24000);
  });

  it('darkens the wet band and the far coast', () => {
    const wet = shoreColour(-0.5, 20, new Color());
    const beach = shoreColour(-14, 20, new Color());
    const coast = shoreColour(-400, 20, new Color());
    expect(wet.getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(beach.getHSL({ h: 0, s: 0, l: 0 }).l);
    expect(coast.getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(beach.getHSL({ h: 0, s: 0, l: 0 }).l);
  });
});
