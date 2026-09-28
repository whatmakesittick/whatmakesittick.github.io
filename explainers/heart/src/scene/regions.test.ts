import { describe, expect, it } from 'vitest';
import { CHAMBER_IDS, VALVE_IDS } from '../ids';
import type { RegionId } from '../ids';
import { CHAMBERS, HEART_EXTENT, SCENE_EXTENT, VALVES } from '../model';
import { PULMONARY_RING } from './constants';
import { REGIONS, ringCentre } from './regions';

const REGION_IDS: readonly RegionId[] = [
  'scene',
  'heart',
  'chambers',
  'leftHeart',
  'rightHeart',
  'conduction',
  'valves',
  'atria',
  'ventricles',
];

function holds(region: RegionId, point: readonly number[]): boolean {
  const { x, y, z } = REGIONS[region];
  return (
    point[0] >= x[0] &&
    point[0] <= x[1] &&
    point[1] >= y[0] &&
    point[1] <= y[1] &&
    point[2] >= z[0] &&
    point[2] <= z[1]
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
    expect(REGIONS.scene).toEqual(SCENE_EXTENT);
    expect(REGIONS.heart).toEqual(HEART_EXTENT);
  });

  it('keeps each chamber in its regions', () => {
    for (const id of CHAMBER_IDS) expect(holds('chambers', CHAMBERS[id].centre)).toBe(true);
    expect(holds('leftHeart', CHAMBERS.leftVentricle.centre)).toBe(true);
    expect(holds('rightHeart', CHAMBERS.rightAtrium.centre)).toBe(true);
    expect(holds('atria', CHAMBERS.leftAtrium.centre)).toBe(true);
    expect(holds('ventricles', CHAMBERS.rightVentricle.centre)).toBe(true);
  });

  it('frames every valve ring where it is drawn', () => {
    for (const id of VALVE_IDS) expect(holds('valves', ringCentre(id))).toBe(true);
    expect(ringCentre('pulmonary')).toEqual(PULMONARY_RING);
    expect(ringCentre('mitral')).toEqual(VALVES.mitral.centre);
  });
});
