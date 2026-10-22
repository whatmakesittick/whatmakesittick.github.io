import { describe, expect, it } from 'vitest';
import { BEAM_M, PIER } from '../../../model';
import { CLEAR, CORRIDOR, GROUND, SCENERY } from './constants';
import { footprint, landBlocks } from './ground/blocks';
import { tileFields } from './ground/fields';
import { LINEARS } from './ground/linears';
import { guidewayShadowBand, pierShadow } from './ground/paintShadows';
import { centredWarp } from './ground/warp';
import { periodicCopies } from './scenery/copies';
import { tileTrees } from './scenery/treePlacement';
import { tileVillages } from './scenery/villagePlacement';
import { groundShadow } from './shadow';

const CORRIDOR_BAND = [CORRIDOR.ghostVerge[0], CORRIDOR.service[1]] as const;
const blocks = landBlocks();
const fields = tileFields(blocks);
const trees = tileTrees(LINEARS, fields, blocks);
const villages = tileVillages(blocks, fields);

function overlaps([a0, a1]: readonly number[], [b0, b1]: readonly number[]): boolean {
  return a0 < b1 && b0 < a1;
}

describe('ground warp', () => {
  const warp = centredWarp(GROUND.reach, GROUND.texture.softness);

  it('centres the line and round-trips every distance', () => {
    expect(warp.share(0)).toBeCloseTo(0.5);
    expect(warp.share(-GROUND.reach)).toBeCloseTo(0);
    expect(warp.share(GROUND.reach)).toBeCloseTo(1);
    [-900, -40, 0, 12, 300].forEach((z) => expect(warp.value(warp.share(z))).toBeCloseTo(z, 6));
  });

  it('spends the most texture near the line', () => {
    expect(warp.density(0)).toBeGreaterThan(warp.density(100));
    expect(warp.density(100)).toBeGreaterThan(warp.density(1000));
  });
});

describe('farm tile', () => {
  it('repeats on whole beams so roads always pass between piers', () => {
    expect(GROUND.period / BEAM_M).toBeCloseTo(Math.round(GROUND.period / BEAM_M), 9);
    const underLine = LINEARS.filter(
      (linear) => linear.axis === 'z' && linear.span[0] < 0 && linear.span[1] > 0,
    );
    expect(underLine.length).toBeGreaterThan(0);
    underLine.forEach((linear) => {
      const [from, to] = footprint(linear);
      for (let x = 0; x <= GROUND.period; x += BEAM_M)
        expect(overlaps([from, to], [x - PIER.width / 2, x + PIER.width / 2])).toBe(false);
    });
  });

  it('keeps every field out of the corridor and inside the ground', () => {
    expect(fields.length).toBeGreaterThan(200);
    fields.forEach((field) => {
      expect(overlaps(field.z, CORRIDOR_BAND)).toBe(false);
      expect(field.z[0]).toBeGreaterThanOrEqual(-GROUND.reach);
      expect(field.z[1]).toBeLessThanOrEqual(GROUND.reach);
      expect(field.x[1]).toBeGreaterThan(field.x[0]);
    });
  });

  it('keeps fields off the parallel roads and canals', () => {
    const parallels = LINEARS.filter((linear) => linear.axis === 'x').map(footprint);
    fields.forEach((field) =>
      parallels.forEach((band) => expect(overlaps(field.z, band)).toBe(false)),
    );
  });
});

describe('scenery', () => {
  it('keeps trees and houses clear of the line and the default cameras', () => {
    [...trees, ...villages.houses, ...villages.trees].forEach(({ z }) =>
      expect(z < CLEAR.left || z > CLEAR.right).toBe(true),
    );
  });

  it('keeps trees off the roads and canals they line', () => {
    const parallels = LINEARS.filter((linear) => linear.axis === 'x');
    [...trees, ...villages.trees].forEach(({ z }) =>
      parallels.forEach((linear) =>
        expect(Math.abs(z - linear.centre)).toBeGreaterThan(linear.width / 2),
      ),
    );
  });

  it('stays within the triangle budget once repeated along the line', () => {
    const rowTrees = periodicCopies(trees, GROUND.period, SCENERY.treeReach).length;
    const houses = periodicCopies(villages.houses, SCENERY.villagePeriod, SCENERY.reach).length;
    const villageTrees = periodicCopies(
      villages.trees,
      SCENERY.villagePeriod,
      SCENERY.treeReach,
    ).length;
    expect(rowTrees + villageTrees).toBeLessThan(1400);
    expect(houses).toBeLessThan(260);
  });

  it('copies spots over the whole drawn line', () => {
    const copies = periodicCopies([{ x: 10 }], GROUND.period, SCENERY.reach);
    expect(Math.min(...copies.map(({ x }) => x))).toBeLessThan(-SCENERY.reach + GROUND.period);
    expect(Math.max(...copies.map(({ x }) => x))).toBeGreaterThan(SCENERY.reach);
  });
});

describe('ground shadows', () => {
  it('falls away from the sun, to the right of the line', () => {
    expect(groundShadow(3, 0, 4)).toEqual([3, 4]);
    const [near, far] = guidewayShadowBand();
    expect(near).toBeGreaterThan(CORRIDOR.verge);
    expect(far).toBeGreaterThan(near);
    const outline = pierShadow(0);
    expect(Math.max(...outline.map(([, z]) => z))).toBeCloseTo(
      groundShadow(0, PIER.height, PIER.depth / 2)[1],
    );
  });
});
