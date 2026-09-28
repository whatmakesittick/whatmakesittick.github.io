import { describe, expect, it } from 'vitest';
import { CHAMBERS, VALVES } from '../../model';
import { CAVITY_CONTRACTION, CONTRACTION_FRAME, OUTER_CONTRACTION } from '../constants';
import { contraction, displace, leftAxisX, ventricleWeight } from './contraction';
import type { Offset } from './contraction';

const outer = contraction(CONTRACTION_FRAME, OUTER_CONTRACTION);
const cavity = contraction(CONTRACTION_FRAME, CAVITY_CONTRACTION);

function offset(
  field: (x: number, y: number, z: number, out: Offset) => Offset,
  x: number,
  y: number,
  z: number,
): Offset {
  return field(x, y, z, [0, 0, 0]);
}

describe('contraction fields', () => {
  it('leaves the cut plane flat', () => {
    for (const [x, y] of [
      [20, -40],
      [-25, -20],
      [-27, 30],
      [24, 28],
    ] as const) {
      expect(offset(outer.squeeze, x, y, 0)[2]).toBeCloseTo(0, 9);
      expect(offset(cavity.emptying, x, y, 0)[2]).toBeCloseTo(0, 9);
    }
  });

  it('holds the valve plane still and squeezes only below it', () => {
    const base = VALVES.mitral.centre[1];
    expect(ventricleWeight(CONTRACTION_FRAME, base + 5)).toBe(0);
    expect(ventricleWeight(CONTRACTION_FRAME, base - 40)).toBe(1);
    expect(Math.hypot(...offset(outer.squeeze, 20, base + 10, 5))).toBe(0);
  });

  it('pulls the left ventricle wall toward its axis and lifts the apex', () => {
    const [x, y] = [45, -40];
    const [dx, dy] = offset(outer.squeeze, x, y, 0);
    expect(dx).toBeLessThan(0);
    expect(dy).toBeGreaterThan(0);
    expect(leftAxisX(y)).toBeGreaterThan(VALVES.mitral.centre[0]);
  });

  it('moves the cavity more than the outer wall so the wall thickens', () => {
    const outerShift = offset(outer.squeeze, 44, -35, 0)[0];
    const cavityShift = offset(cavity.squeeze, 36, -35, 0)[0];
    expect(Math.abs(cavityShift)).toBeGreaterThan(Math.abs(outerShift));
  });

  it('shrinks the atria toward their centres as they empty', () => {
    const [cx, cy] = CHAMBERS.rightAtrium.centre;
    const [dx, dy] = offset(cavity.emptying, cx - 15, cy + 10, 0);
    expect(dx).toBeGreaterThan(0);
    expect(dy).toBeLessThan(0);
    expect(Math.hypot(...offset(cavity.emptying, 20, -40, 0))).toBe(0);
  });

  it('adds both motions to a point', () => {
    const moved = displace(cavity, [36, -35, 4], 1, 0, [0, 0, 0]);
    expect(moved[0]).toBeLessThan(36);
    expect(moved[2]).toBeLessThan(4);
    expect(displace(cavity, [36, -35, 4], 0, 0, [0, 0, 0])).toEqual([36, -35, 4]);
  });
});
