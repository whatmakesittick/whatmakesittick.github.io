import { describe, expect, it } from 'vitest';
import type { RegionId } from '../ids';
import {
  BULLET_SEAT_X,
  CARTRIDGE,
  GAS_BLOCK,
  HAMMER,
  MAGAZINE,
  RECEIVER,
  STOCK,
} from '../model/layout';
import type { Point } from '../model/scale';
import { COMPENSATOR, MAGAZINE_BOTTOM } from './constants';
import { REGIONS } from './regions';

const REGION_IDS: readonly RegionId[] = [
  'scene',
  'rifle',
  'receiver',
  'chamber',
  'barrel',
  'gasSystem',
  'reloadBay',
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

  it('frames the whole rifle from the butt to the compensator and the magazine floor', () => {
    expect(holds('rifle', [STOCK.x[0], 0, 0])).toBe(true);
    expect(holds('rifle', [COMPENSATOR.x[1], 0, 0])).toBe(true);
    expect(holds('rifle', [MAGAZINE.well.x[1], MAGAZINE_BOTTOM, 0])).toBe(true);
  });

  it('keeps the floor just under the magazine', () => {
    expect(REGIONS.scene.y[0]).toBeLessThan(MAGAZINE_BOTTOM);
    expect(REGIONS.scene.y[0]).toBeGreaterThan(MAGAZINE_BOTTOM - 10);
  });

  it('frames the parts each camera view is about', () => {
    expect(holds('chamber', [0, 0, 0])).toBe(true);
    expect(holds('chamber', [CARTRIDGE.length, 0, 0])).toBe(true);
    expect(holds('barrel', [BULLET_SEAT_X, 0, 0])).toBe(true);
    expect(holds('gasSystem', [GAS_BLOCK.x[1], 24, 0])).toBe(true);
    expect(holds('receiver', HAMMER.centre)).toBe(true);
    expect(holds('reloadBay', [RECEIVER.x[0] + 20, 18, 0])).toBe(true);
  });
});
