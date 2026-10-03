import { describe, expect, it } from 'vitest';
import { SLIPWAY } from '../../model/layout';
import { gridHeight, terrainGrid } from './shoreGrid';
import { SCRUB, TUFTS, scatterRocks, scatterScrub, scatterTufts } from './shoreScatter';
import { slipwayGap, stationGap, trackHit } from './shoreTerrain';

const grid = terrainGrid();
const scrub = scatterScrub(grid);
const tufts = scatterTufts(grid);
const rocks = scatterRocks(grid);

describe('shore scatter', () => {
  it('fills the scrub and grass budgets', () => {
    expect(scrub).toHaveLength(SCRUB.count);
    expect(tufts).toHaveLength(TUFTS.count);
    expect(rocks.length).toBeGreaterThan(0);
  });

  it('keeps plants off the slipway, the track and the station pad', () => {
    [...scrub, ...tufts].forEach(({ x, z }) => {
      expect(slipwayGap(x, z)).toBeGreaterThan(0);
      expect(stationGap(x, z)).toBeGreaterThan(0);
      const hit = trackHit(x, z);
      if (hit) expect(hit.distance).toBeGreaterThan(1);
    });
  });

  it('sinks every item into the ground so none float', () => {
    [...scrub, ...tufts, ...rocks].forEach(({ x, y, z }) => {
      expect(y).toBeLessThanOrEqual(gridHeight(grid, x, z));
    });
  });

  it('keeps rocks beside the ramp and out of the boat lane', () => {
    rocks.forEach(({ z }) => expect(Math.abs(z)).toBeGreaterThan(SLIPWAY.z[1]));
  });

  it('places the same items on every build', () => {
    expect(scatterScrub(grid)).toEqual(scrub);
  });
});
