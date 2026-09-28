import { ExtrudeGeometry, Path, Shape, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { FULL_TURN } from '../../math';

export interface Rect {
  minA: number;
  minB: number;
  maxA: number;
  maxB: number;
}

export interface PlanPoint {
  x: number;
  z: number;
}

const CURVE_SEGMENTS = 6;
const QUARTER_TURN = FULL_TURN / 4;
const HALF_TURN = FULL_TURN / 2;

function extrude(shape: Shape, depth: number): ExtrudeGeometry {
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: CURVE_SEGMENTS });
}

export function extrudePlan(shape: Shape, bottom: number, top: number): BufferGeometry {
  const geometry = extrude(shape, top - bottom);
  geometry.rotateX(QUARTER_TURN);
  geometry.translate(0, top, 0);
  return geometry;
}

export function extrudeProfileAlongX(shape: Shape, start: number, end: number): BufferGeometry {
  const geometry = extrude(shape, end - start);
  geometry.rotateY(-QUARTER_TURN);
  geometry.translate(end, 0, 0);
  return geometry;
}

function traceRoundedRect<T extends Path>(path: T, rect: Rect, radius: number): T {
  const { minA, minB, maxA, maxB } = rect;
  const r = Math.min(radius, (maxA - minA) / 2, (maxB - minB) / 2);
  path.moveTo(minA + r, minB);
  path.lineTo(maxA - r, minB);
  path.absarc(maxA - r, minB + r, r, -QUARTER_TURN, 0, false);
  path.lineTo(maxA, maxB - r);
  path.absarc(maxA - r, maxB - r, r, 0, QUARTER_TURN, false);
  path.lineTo(minA + r, maxB);
  path.absarc(minA + r, maxB - r, r, QUARTER_TURN, HALF_TURN, false);
  path.lineTo(minA, minB + r);
  path.absarc(minA + r, minB + r, r, HALF_TURN, HALF_TURN + QUARTER_TURN, false);
  return path;
}

export function roundedRectShape(rect: Rect, radius: number): Shape {
  return traceRoundedRect(new Shape(), rect, radius);
}

export function roundedRectHole(rect: Rect, radius: number): Path {
  return traceRoundedRect(new Path(), rect, radius);
}

function planVectors(points: readonly PlanPoint[]): Vector2[] {
  return points.map((point) => new Vector2(point.x, point.z));
}

export function planShape(points: readonly PlanPoint[]): Shape {
  return new Shape(planVectors(points));
}

export function planHole(points: readonly PlanPoint[]): Path {
  return new Path(planVectors(points));
}
