import { describe, expect, it } from 'vitest';
import { ANCHOR_IDS, REGION_IDS } from '../ids';
import {
  HELIX_AXIS,
  MIXING_BEAKER,
  MIXING_FLOOR_Y,
  MIXING_RIM_Y,
  MOLECULE_ORIGIN,
  POUR_BEAKER,
  REGION_SPECS,
  SOLUTION_BOX,
  STIR_BAR,
  STIR_BAR_Y,
  STIR_DEG_PER_S,
  THERMOMETER,
  mixtureLevelCm,
  pourBeakerLevelCm,
  worldAnchorPoint,
  worldRegionSpec,
} from './layout';
import { HELIX_GEOMETRY } from './scale';
import type { Point } from '../ids';

function inside([x, y, z]: Point, id: (typeof REGION_IDS)[number]): boolean {
  const spec = worldRegionSpec(id);
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

  it('fills the mixing beaker from 3.9 cm to 6.3 cm and empties the pour beaker', () => {
    expect(mixtureLevelCm(0)).toBeCloseTo(3.9, 1);
    expect(mixtureLevelCm(1)).toBeCloseTo(6.3, 1);
    expect(pourBeakerLevelCm(0)).toBeCloseTo(3.9, 1);
    expect(pourBeakerLevelCm(1)).toBe(0);
    expect(MIXING_FLOOR_Y + mixtureLevelCm(1)).toBeLessThan(MIXING_RIM_Y);
  });

  it('rests the stir bar on the beaker floor and spins it at 240 rpm', () => {
    expect(STIR_BAR_Y - STIR_BAR.height / 2).toBeCloseTo(MIXING_FLOOR_Y, 9);
    expect(STIR_BAR.length).toBeLessThan(MIXING_BEAKER.innerRadius * 2);
    expect(STIR_DEG_PER_S).toBe(1440);
  });

  it('pours from a lip above the liquid inside the rim', () => {
    const [x, y, z] = POUR_BEAKER.lip;
    expect(Math.hypot(x, z)).toBeLessThan(MIXING_BEAKER.innerRadius - 1);
    expect(y).toBeGreaterThan(MIXING_RIM_Y);
  });

  it('dips the thermometer bulb into the liquid and passes inside the rim', () => {
    const { bulb, top } = THERMOMETER;
    expect(bulb[1]).toBeLessThan(MIXING_FLOOR_Y + mixtureLevelCm(0));
    const share = (MIXING_RIM_Y - bulb[1]) / (top[1] - bulb[1]);
    const atRim = [0, 2].map((axis) => bulb[axis] + share * (top[axis] - bulb[axis]));
    expect(Math.hypot(atRim[0], atRim[1])).toBeLessThan(MIXING_BEAKER.innerRadius);
  });

  it('sets the molecule world inside the liquid', () => {
    const [, y] = MOLECULE_ORIGIN;
    expect(y).toBeGreaterThan(MIXING_FLOOR_Y);
    expect(y).toBeLessThan(MIXING_FLOOR_Y + mixtureLevelCm(1));
  });

  it('fits the helix in the solution box and in its region', () => {
    expect(HELIX_AXIS.x - HELIX_GEOMETRY.outerRadiusA).toBeGreaterThanOrEqual(SOLUTION_BOX.x[0]);
    expect(HELIX_AXIS.y).toEqual([-20, 20]);
    const helix = REGION_SPECS.helix;
    expect(HELIX_AXIS.x - HELIX_GEOMETRY.outerRadiusA).toBeGreaterThan(helix.x[0]);
    expect(HELIX_AXIS.x + HELIX_GEOMETRY.outerRadiusA).toBeLessThan(helix.x[1]);
  });

  it('puts each anchor inside the region its view frames', () => {
    expect(inside(worldAnchorPoint('liquidCentre'), 'beaker')).toBe(true);
    expect(inside(worldAnchorPoint('eventCentre'), 'event')).toBe(true);
    expect(inside(worldAnchorPoint('helixCentre'), 'helix')).toBe(true);
    expect(ANCHOR_IDS).toHaveLength(3);
  });

  it('offsets the molecule regions by the molecule origin', () => {
    expect(worldRegionSpec('solution').y).toEqual([
      -20 + MOLECULE_ORIGIN[1],
      20 + MOLECULE_ORIGIN[1],
    ]);
    expect(worldRegionSpec('bench')).toEqual(REGION_SPECS.bench);
  });
});
