import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  FLAT,
  annulusPoint,
  ease,
  planAngle,
  planDirection,
  ringFrame,
  ringTube,
  saddle,
  sheetIndex,
} from './valveFrame';

const FRAME = ringFrame([0, 0, 0], [0, -1, 0], 10);

describe('valve frames', () => {
  it('builds an orthonormal frame around the flow', () => {
    expect(FRAME.normal.y).toBeCloseTo(-1, 5);
    expect(FRAME.across.dot(FRAME.normal)).toBeCloseTo(0, 5);
    expect(FRAME.along.dot(FRAME.across)).toBeCloseTo(0, 5);
    expect(planDirection(FRAME, 0).equals(FRAME.across)).toBe(true);
  });

  it('measures the angle of a point around the ring', () => {
    const point = annulusPoint(FRAME, FLAT, 1.2);
    expect(planAngle(FRAME, [point.x, point.y, point.z])).toBeCloseTo(1.2, 5);
    expect(point.length()).toBeCloseTo(10, 5);
  });

  it('lifts a saddle annulus toward the atrium at its peaks', () => {
    const lift = saddle(2, 0);
    expect(annulusPoint(FRAME, lift, 0).y).toBeCloseTo(2, 5);
    expect(annulusPoint(FRAME, lift, Math.PI).y).toBeCloseTo(2, 5);
    expect(annulusPoint(FRAME, lift, Math.PI / 2).y).toBeCloseTo(-2, 5);
  });

  it('wraps a tube around the annulus', () => {
    const tube = ringTube(FRAME, FLAT, { segments: 24, radialSegments: 6, tubeRadius: 1 });
    const positions = tube.getAttribute('position').array;
    const radius = new Vector3(positions[0], positions[1], positions[2]).length();
    expect(radius).toBeCloseTo(11, 3);
    expect(tube.getIndex()?.count).toBe(24 * 6 * 6);
    const index = tube.getIndex()?.array ?? [];
    const corner = (slot: number) =>
      new Vector3(
        positions[index[slot] * 3],
        positions[index[slot] * 3 + 1],
        positions[index[slot] * 3 + 2],
      );
    const facing = corner(1)
      .sub(corner(0))
      .cross(corner(2).sub(corner(0)));
    const normals = tube.getAttribute('normal').array;
    const normal = new Vector3(
      normals[index[0] * 3],
      normals[index[0] * 3 + 1],
      normals[index[0] * 3 + 2],
    );
    expect(facing.dot(normal)).toBeGreaterThan(0);
  });

  it('indexes a sheet of columns and rows', () => {
    const index = sheetIndex(3, 2);
    expect(index).toHaveLength(3 * 2 * 6);
    expect(Math.max(...index)).toBe(4 * 3 - 1);
  });

  it('eases smoothly between zero and one', () => {
    expect(ease(-1)).toBe(0);
    expect(ease(0.5)).toBe(0.5);
    expect(ease(2)).toBe(1);
  });
});
