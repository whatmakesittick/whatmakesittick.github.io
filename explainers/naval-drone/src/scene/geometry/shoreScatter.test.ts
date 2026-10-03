import { describe, expect, it } from 'vitest';
import { SLIPWAY } from '../../model/layout';
import { SCRUB_COUNT, scatterRocks, scatterScrub } from './shoreScatter';
import type { TerrainGrid } from './shoreTerrain';
import { slipwayGap, stationGap, terrainGrid } from './shoreTerrain';

const grid = terrainGrid();
const scrub = scatterScrub();
const rocks = scatterRocks();

function cell(lines: readonly number[], value: number): number {
  return lines.findIndex((line, index) => value >= line && value <= lines[index + 1]);
}

function meshHeight({ xs, zs, heights }: TerrainGrid, x: number, z: number): number {
  const column = cell(xs, x);
  const row = cell(zs, z);
  const s = (x - xs[column]) / (xs[column + 1] - xs[column]);
  const t = (z - zs[row]) / (zs[row + 1] - zs[row]);
  const at = (dx: number, dz: number) => heights[(row + dz) * xs.length + column + dx];
  if (s + t <= 1) return at(0, 0) + s * (at(1, 0) - at(0, 0)) + t * (at(0, 1) - at(0, 0));
  return at(1, 1) + (1 - s) * (at(0, 1) - at(1, 1)) + (1 - t) * (at(1, 0) - at(1, 1));
}

describe('shore scatter', () => {
  it('fills the scrub budget', () => {
    expect(scrub).toHaveLength(SCRUB_COUNT);
    expect(rocks.length).toBeGreaterThan(0);
  });

  it('keeps scrub off the slipway and the station pad', () => {
    scrub.forEach(({ x, z }) => {
      expect(slipwayGap(x, z)).toBeGreaterThan(0);
      expect(stationGap(x, z)).toBeGreaterThan(0);
    });
  });

  it('sinks every item into the ground so none float', () => {
    [...scrub, ...rocks].forEach(({ x, y, z }) => {
      expect(y).toBeLessThanOrEqual(meshHeight(grid, x, z));
    });
  });

  it('keeps rocks beside the ramp and out of the boat lane', () => {
    rocks.forEach(({ z }) => expect(Math.abs(z)).toBeGreaterThan(SLIPWAY.z[1]));
  });

  it('places the same items on every build', () => {
    expect(scatterScrub()).toEqual(scrub);
  });
});
