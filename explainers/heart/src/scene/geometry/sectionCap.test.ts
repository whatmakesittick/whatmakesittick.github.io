import { describe, expect, it } from 'vitest';
import { CAP } from '../constants';
import type { Offset } from './contraction';
import { ellipsoid } from './field';
import { sectionCap, sectionField } from './sectionCap';
import type { Portal } from './vesselPath';

const still = (_x: number, _y: number, _z: number, out: Offset) => {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  return out;
};
const lift = (_x: number, _y: number, _z: number, out: Offset) => {
  out[0] = 0;
  out[1] = 1;
  out[2] = 0;
  return out;
};
const FIELDS = {
  envelope: ellipsoid([0, 0, 0], [20, 30, 15]),
  cavities: [ellipsoid([0, 0, 0], [10, 18, 10])],
  portals: [] as Portal[],
};
const BOUNDS = {
  min: [-30, -40, -20] as [number, number, number],
  max: [30, 40, 20] as [number, number, number],
};

describe('section cap', () => {
  it('marks the wall between the outline and the cavity', () => {
    const field = sectionField(FIELDS, 0);
    expect(field(15, 0)).toBeLessThan(0);
    expect(field(0, 0)).toBeGreaterThan(0);
    expect(field(25, 0)).toBeGreaterThan(0);
  });

  it('triangulates the wall in the cut plane with muscle colours and motion', () => {
    const geometry = sectionCap(FIELDS, BOUNDS, CAP, {
      outer: { squeeze: still, emptying: still },
      cavity: { squeeze: lift, emptying: still },
    });
    const positions = geometry.getAttribute('position').array;
    for (let offset = 2; offset < positions.length; offset += 3) expect(positions[offset]).toBe(0);
    expect(geometry.getAttribute('color').count).toBe(geometry.getAttribute('position').count);
    const squeeze = geometry.morphAttributes.position?.[0].array ?? [];
    let moved = 0;
    for (let offset = 1; offset < squeeze.length; offset += 3) moved += squeeze[offset];
    expect(moved).toBeGreaterThan(0);
    const holeRadius = Math.min(
      ...Array.from({ length: positions.length / 3 }, (_, vertex) =>
        Math.hypot(positions[vertex * 3] / 10, positions[vertex * 3 + 1] / 18),
      ),
    );
    expect(holeRadius).toBeGreaterThan(0.9);
  });
});
