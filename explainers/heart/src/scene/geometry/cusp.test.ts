import { describe, expect, it } from 'vitest';
import { crownHeight, crownLift, cuspIndex, cuspPoint, cuspVertexCount, writeCusp } from './cusp';
import { ringFrame } from './valveFrame';

const SHAPE = {
  count: 3,
  firstCommissure: Math.PI / 2,
  columns: 12,
  rows: 6,
  commissureHeightMm: 8,
  meetHeightMm: 6,
  edgeSagMm: 1,
  bellyMm: 3,
  wallInsetMm: 1,
  openBellyMm: 0.5,
};
const VALVE = { frame: ringFrame([0, 0, 0], [0, 1, 0], 10), shape: SHAPE };

describe('semilunar cusps', () => {
  it('attaches each cusp along a U that rises to the commissures', () => {
    expect(crownHeight(SHAPE, Math.PI / 2)).toBeCloseTo(8, 5);
    expect(crownHeight(SHAPE, Math.PI / 2 + Math.PI / 3)).toBeCloseTo(0, 5);
    expect(crownLift(SHAPE)(Math.PI / 2)).toBeCloseTo(-8, 5);
    expect(cuspPoint(VALVE, 0, 0.5, 0, 0).y).toBeCloseTo(0, 5);
    expect(cuspPoint(VALVE, 0, 0, 0, 0).y).toBeCloseTo(8, 5);
  });

  it('meets the other cusps in a Y at the centre when shut', () => {
    for (let cusp = 0; cusp < 3; cusp += 1) {
      const tip = cuspPoint(VALVE, cusp, 0.5, SHAPE.rows, 0);
      expect(Math.hypot(tip.x, tip.z)).toBeLessThan(1e-6);
      expect(tip.y).toBeCloseTo(6, 5);
    }
    const seamA = cuspPoint(VALVE, 0, 0.25, SHAPE.rows, 0);
    const seamB = cuspPoint(VALVE, 2, 0.75, SHAPE.rows, 0);
    expect(seamA.distanceTo(cuspPoint(VALVE, 0, 0.25, SHAPE.rows, 0))).toBe(0);
    expect(Math.hypot(seamA.x, seamA.z)).toBeGreaterThan(1);
    expect(seamB.y).toBeLessThan(8);
  });

  it('cups each pocket toward the ventricle when shut', () => {
    const belly = cuspPoint(VALVE, 0, 0.5, SHAPE.rows / 2, 0);
    const rim = cuspPoint(VALVE, 0, 0.5, SHAPE.rows, 0);
    expect(belly.y).toBeLessThan(rim.y);
  });

  it('folds each cusp against the wall and leaves a round opening when open', () => {
    for (let cusp = 0; cusp < 3; cusp += 1) {
      const tip = cuspPoint(VALVE, cusp, 0.5, SHAPE.rows, 1);
      expect(Math.hypot(tip.x, tip.z)).toBeCloseTo(9, 3);
      expect(tip.y).toBeCloseTo(8, 3);
    }
  });

  it('writes a sheet for each cusp', () => {
    const target = new Float32Array(cuspVertexCount(SHAPE) * 3);
    writeCusp(VALVE, 1, 0.5, target);
    expect(target.some((value) => value !== 0)).toBe(true);
    expect(cuspIndex(SHAPE)).toHaveLength(SHAPE.columns * SHAPE.rows * 6);
  });
});
