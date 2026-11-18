import { describe, expect, it } from 'vitest';
import { REGION_IDS } from '../ids';
import type { Point, RegionId } from '../ids';
import {
  AIRWAY,
  ANCHOR_POINTS,
  BITE_SPOT,
  COLUMN_SCATTER,
  CUT_PAPILLA,
  HEAD_BOX,
  LINEUP_Y,
  NASAL_CAVITY,
  NOSTRILS,
  ODORANT_COLUMN_X,
  OLFACTORY_BULB,
  REGION_SPECS,
  SMELL_PATCH,
  SOFT_PALATE,
  SPOON_STOPS,
  THROAT,
  TONGUE,
  TONGUE_BITE,
  puddleRadius,
  receptorCell,
  scoopRadius,
} from './layout';

function inside([x, y, z]: Point, id: RegionId): boolean {
  const spec = REGION_SPECS[id];
  return (
    x >= spec.x[0] &&
    x <= spec.x[1] &&
    y >= spec.y[0] &&
    y <= spec.y[1] &&
    z >= spec.z[0] &&
    z <= spec.z[1]
  );
}

describe('layout', () => {
  it('gives every region a box with positive size', () => {
    REGION_IDS.forEach((id) =>
      (['x', 'y', 'z'] as const).forEach((axis) =>
        expect(REGION_SPECS[id][axis][1]).toBeGreaterThan(REGION_SPECS[id][axis][0]),
      ),
    );
  });

  it('faces the head toward +x with the nostrils at the front', () => {
    expect(NOSTRILS[0]).toBeGreaterThan(NASAL_CAVITY.x[1]);
    expect(TONGUE.tip[0]).toBeGreaterThan(TONGUE.root[0]);
    expect(SPOON_STOPS.lips[0]).toBeGreaterThan(SPOON_STOPS.inMouth[0]);
  });

  it('puts the smell patch on the cavity roof, above the palate, under the bulb', () => {
    expect(SMELL_PATCH.centre[1]).toBeGreaterThan(NASAL_CAVITY.y[1]);
    expect(OLFACTORY_BULB[1]).toBeGreaterThan(SMELL_PATCH.centre[1]);
  });

  it('joins mouth and nose behind the soft palate and drops the throat behind the tongue root', () => {
    expect(AIRWAY.bottom[0]).toBeLessThan(SOFT_PALATE.back[0]);
    expect(AIRWAY.top[1]).toBeGreaterThan(NASAL_CAVITY.y[0]);
    expect(THROAT.top[0]).toBeLessThan(TONGUE.root[0]);
    expect(THROAT.bottom[1]).toBeGreaterThanOrEqual(HEAD_BOX.y[0]);
  });

  it('frames every head point in the head region', () => {
    [
      ...Object.values(SPOON_STOPS).filter((stop) => stop !== SPOON_STOPS.away),
      BITE_SPOT,
      NOSTRILS,
      OLFACTORY_BULB,
      THROAT.bottom,
    ].forEach((point) => expect(inside(point, 'head')).toBe(true));
    [NOSTRILS, AIRWAY.bottom, AIRWAY.top, SMELL_PATCH.centre, OLFACTORY_BULB].forEach((point) =>
      expect(inside(point, 'nose')).toBe(true),
    );
  });

  it('shrinks the bite and spreads the puddle as it melts', () => {
    expect(scoopRadius(0)).toBe(9);
    expect(scoopRadius(1)).toBeCloseTo(3.6, 9);
    expect(puddleRadius(0)).toBe(9);
    expect(puddleRadius(1)).toBe(15);
    expect(TONGUE_BITE.centre[1] + TONGUE_BITE.radius).toBeLessThanOrEqual(REGION_SPECS.scoop.y[1]);
    expect(inside(CUT_PAPILLA.centre, 'tonguePatch')).toBe(true);
  });

  it('lays the receptor grid out row by row from x -14 to 14 and z -8 to 8', () => {
    expect(receptorCell(0)).toEqual([-14, -10, -8]);
    expect(receptorCell(7)).toEqual([14, -10, -8]);
    expect(receptorCell(8)).toEqual([-14, -10, -4]);
    expect(receptorCell(39)).toEqual([14, -10, 8]);
    expect(inside(receptorCell(0), 'receptorGrid')).toBe(true);
    expect(inside(receptorCell(39), 'receptorGrid')).toBe(true);
  });

  it('fits the five scattered columns in the lineup', () => {
    Object.values(ODORANT_COLUMN_X).forEach((x) => {
      expect(
        inside([x - COLUMN_SCATTER, LINEUP_Y - COLUMN_SCATTER, -COLUMN_SCATTER], 'lineup'),
      ).toBe(true);
      expect(
        inside([x + COLUMN_SCATTER, LINEUP_Y + COLUMN_SCATTER, COLUMN_SCATTER], 'lineup'),
      ).toBe(true);
    });
  });

  it('puts each anchor inside the regions of its scale', () => {
    expect(inside(ANCHOR_POINTS.bite, 'head')).toBe(true);
    expect(inside(ANCHOR_POINTS.smellPatch, 'nose')).toBe(true);
    expect(inside(ANCHOR_POINTS.tongueBite, 'scoop')).toBe(true);
    expect(inside(ANCHOR_POINTS.grid, 'receptorGrid')).toBe(true);
  });
});
