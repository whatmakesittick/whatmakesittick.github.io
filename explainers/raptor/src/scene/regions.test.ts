import { describe, expect, it } from 'vitest';
import type { RegionId } from '../ids';
import {
  BOOSTER_AXIS,
  CHAMBER,
  NOZZLE_EXIT,
  PREBURNERS,
  THROAT,
  TURBOPUMPS,
  clusterEngines,
} from '../model';
import type { Point } from '../model';
import { REGIONS } from './regions';

const REGION_IDS: readonly RegionId[] = [
  'scene',
  'engine',
  'hero',
  'powerhead',
  'turbopumps',
  'chamber',
  'nozzle',
  'nozzleAndPlume',
  'booster',
];

function holds(region: RegionId, [x, y, z]: Point): boolean {
  const box = REGIONS[region];
  return (
    x >= box.x[0] &&
    x <= box.x[1] &&
    y >= box.y[0] &&
    y <= box.y[1] &&
    z >= box.z[0] &&
    z <= box.z[1]
  );
}

describe('regions', () => {
  it('defines every region with ordered extents', () => {
    for (const id of REGION_IDS) {
      const { x, y, z } = REGIONS[id];
      expect(x[0]).toBeLessThan(x[1]);
      expect(y[0]).toBeLessThan(y[1]);
      expect(z[0]).toBeLessThan(z[1]);
    }
  });

  it('frames the parts each camera view is about', () => {
    expect(holds('turbopumps', TURBOPUMPS.oxygen.centre)).toBe(true);
    expect(holds('turbopumps', PREBURNERS.methane.centre)).toBe(true);
    expect(holds('chamber', [0, CHAMBER.top, 0])).toBe(true);
    expect(holds('chamber', [0, THROAT.y, 0])).toBe(true);
    expect(holds('nozzle', [NOZZLE_EXIT.radius, NOZZLE_EXIT.y, 0])).toBe(true);
    expect(holds('hero', [0, NOZZLE_EXIT.y - 500, 0])).toBe(true);
    expect(holds('nozzleAndPlume', [0, NOZZLE_EXIT.y - 1400, 0])).toBe(true);
  });

  it('holds every engine of the booster and the top of its plumes', () => {
    for (const engine of clusterEngines()) expect(holds('booster', engine.position)).toBe(true);
    expect(holds('booster', [BOOSTER_AXIS.x, NOZZLE_EXIT.y - 800, BOOSTER_AXIS.z])).toBe(true);
  });
});
