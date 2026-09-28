import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three';
import {
  extrudePlan,
  extrudeProfileAlongX,
  planHole,
  planShape,
  roundedRectHole,
  roundedRectShape,
} from './extrude';

const SQUARE = [
  { x: 1, z: 2 },
  { x: 4, z: 2 },
  { x: 4, z: 6 },
  { x: 1, z: 6 },
];
const DIGITS = 9;
const TOLERANCE = 1e-9;

function extent(geometry: BufferGeometry): { min: number[]; max: number[] } {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) throw new Error('empty geometry');
  return { min: bounds.min.toArray(), max: bounds.max.toArray() };
}

function expectClose(actual: number[], expected: number[]): void {
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], DIGITS));
}

describe('extrudePlan', () => {
  it('raises a plan outline in x and z between two heights', () => {
    const { min, max } = extent(extrudePlan(planShape(SQUARE), -3, 5));
    expectClose(min, [1, -3, 2]);
    expectClose(max, [4, 5, 6]);
  });
});

describe('extrudeProfileAlongX', () => {
  it('runs a profile in z and y from start to end along x', () => {
    const profile = roundedRectShape({ minA: -2, minB: 0, maxA: 2, maxB: 3 }, 0.5);
    const { min, max } = extent(extrudeProfileAlongX(profile, -1, 7));
    expectClose(min, [-1, 0, -2]);
    expectClose(max, [7, 3, 2]);
  });
});

describe('outlines', () => {
  it('keeps a rounded corner within half the shorter side', () => {
    const rect = { minA: 0, minB: 0, maxA: 2, maxB: 10 };
    const points = roundedRectShape(rect, 5).getPoints();
    points.forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(-TOLERANCE);
      expect(point.x).toBeLessThanOrEqual(rect.maxA + TOLERANCE);
    });
    expect(roundedRectHole(rect, 5).getPoints()).toEqual(points);
  });

  it('draws plan points with x across and z down the page', () => {
    const outline = planShape(SQUARE).getPoints();
    expect(outline[1].toArray()).toEqual([4, 2]);
    expect(planHole(SQUARE).getPoints()).toEqual(outline);
  });
});
