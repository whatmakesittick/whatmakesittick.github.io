import { describe, expect, it } from 'vitest';
import { Vector2, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { hollowRect, oriented, rectLoop, roundCorners, signedArea, thickenPath } from './profile';
import { arcAngles, FULL_TURN, isFullArc, sectionCap, sweepCaps, sweepProfile } from './sweep';

const TOLERANCE = 1e-6;
const QUARTER: { start: number; end: number } = { start: 0, end: FULL_TURN / 4 };
const FULL = { start: 0, end: FULL_TURN };

function triangleArea(geometry: BufferGeometry): number {
  const corners = points(geometry);
  let area = 0;
  for (let index = 0; index < corners.length; index += 3) {
    const [a, b, c] = corners.slice(index, index + 3);
    area += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
  }
  return area;
}

function points(geometry: BufferGeometry): Vector3[] {
  const position = geometry.getAttribute('position');
  return Array.from({ length: position.count }, (_, index) =>
    new Vector3().fromBufferAttribute(position, index),
  );
}

describe('profile helpers', () => {
  it('winds a rectangle counter clockwise and flips it on request', () => {
    const loop = rectLoop(1, 2, -1, 1);
    expect(signedArea(loop)).toBeCloseTo(2);
    expect(signedArea(oriented(loop, false))).toBeCloseTo(-2);
  });

  it('rounds every corner with the requested steps', () => {
    const steps = 4;
    expect(roundCorners(rectLoop(1, 2, -1, 1), 0.1, steps)).toHaveLength(4 * (steps + 1));
  });

  it('thickens a straight path into a closed band of even width', () => {
    const path = [new Vector2(1, 0), new Vector2(1, 1)];
    const band = thickenPath(path, 0.1);
    expect(band).toHaveLength(4);
    expect(band[2].x).toBeCloseTo(0.9);
    expect(Math.abs(signedArea(band))).toBeCloseTo(0.1);
  });

  it('keeps the hole of a hollow vessel inside its walls', () => {
    const { outer, holes } = hollowRect(1, 2, 1, 0.1, 0.2, 3);
    expect(Math.abs(signedArea(holes[0]))).toBeLessThan(Math.abs(signedArea(outer)));
    holes[0].forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(1.1 - TOLERANCE);
      expect(point.x).toBeLessThanOrEqual(1.9 + TOLERANCE);
    });
  });
});

describe('sweeps', () => {
  it('spans the arc with both ends included', () => {
    const angles = arcAngles(QUARTER, 16);
    expect(angles).toHaveLength(5);
    expect(angles.at(-1)).toBeCloseTo(QUARTER.end);
    expect(isFullArc(FULL)).toBe(true);
    expect(isFullArc(QUARTER)).toBe(false);
  });

  it('keeps a swept ring inside its radii with unit normals', () => {
    const profile = { outer: rectLoop(1, 2, -1, 1), holes: [] };
    const geometry = sweepProfile(profile, { arc: FULL, segmentsPerTurn: 32 });
    points(geometry).forEach((point) => {
      const radius = Math.hypot(point.x, point.y);
      expect(radius).toBeGreaterThanOrEqual(1 - TOLERANCE);
      expect(radius).toBeLessThanOrEqual(2 + TOLERANCE);
    });
    const normal = geometry.getAttribute('normal');
    expect(new Vector3().fromBufferAttribute(normal, 0).length()).toBeCloseTo(1);
  });

  it('caps a partial sweep and stays inside its arc', () => {
    const profile = hollowRect(1, 2, 1, 0.1, 0, 1);
    const open = sweepProfile(profile, { arc: QUARTER, segmentsPerTurn: 32 });
    points(open).forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(-TOLERANCE);
      expect(point.y).toBeGreaterThanOrEqual(-TOLERANCE);
    });
    const lateral = 4 * 2 * 2 * 8;
    expect(open.getAttribute('position').count / 3).toBeGreaterThan(lateral);
  });

  it('fills both cut faces of a rounded profile even with repeated points', () => {
    const loop = roundCorners(rectLoop(1, 1.2, 0, 0.2), 0.1, 3);
    const caps = sweepCaps({ outer: loop, holes: [] }, { arc: QUARTER, segmentsPerTurn: 32 });
    const rounded = 0.2 * 0.2 - (4 - Math.PI) * 0.1 * 0.1;
    expect(triangleArea(caps)).toBeGreaterThan(2 * rounded * 0.95);
    expect(triangleArea(caps)).toBeLessThan(2 * 0.2 * 0.2);
  });

  it('leaves the cut faces off on request', () => {
    const profile = { outer: rectLoop(1, 2, 0, 1), holes: [] };
    const open = sweepProfile(profile, { arc: QUARTER, segmentsPerTurn: 32, capped: false });
    expect(open.getAttribute('position').count / 3).toBe(4 * 2 * 8);
  });

  it('flattens the sides with a squash', () => {
    const profile = { outer: rectLoop(1, 2, -1, 1), holes: [] };
    const geometry = sweepProfile(profile, { arc: FULL, segmentsPerTurn: 32, squash: () => 0.9 });
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.max.x).toBeCloseTo(1.8);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(2);
  });
});

describe('section cap', () => {
  const profile = { outer: rectLoop(1, 2, -1, 1), holes: [] };
  const angle = Math.PI / 2;

  it('lies flat in the cut plane without lift', () => {
    points(sectionCap(profile, angle, 1)).forEach((point) => expect(point.x).toBeCloseTo(0));
  });

  it('lifts off the cut plane along its outward normal', () => {
    const lift = 0.01;
    points(sectionCap(profile, angle, 1, { lift })).forEach((point) =>
      expect(point.x).toBeCloseTo(-lift),
    );
    points(sectionCap(profile, angle, -1, { lift })).forEach((point) =>
      expect(point.x).toBeCloseTo(lift),
    );
  });
});
