import { Path, Shape, Vector2 } from 'three';
import { toRadians } from '@core/math';
import type { PlanPoint } from '../../model';

export interface Rect {
  minA: number;
  minB: number;
  maxA: number;
  maxB: number;
}

const QUARTER_TURN = Math.PI / 2;

function traceRoundedRect<T extends Path>(path: T, rect: Rect, radius: number): T {
  const { minA, minB, maxA, maxB } = rect;
  const r = Math.min(radius, (maxA - minA) / 2, (maxB - minB) / 2);
  path.moveTo(minA + r, minB);
  path.lineTo(maxA - r, minB);
  path.absarc(maxA - r, minB + r, r, -QUARTER_TURN, 0, false);
  path.lineTo(maxA, maxB - r);
  path.absarc(maxA - r, maxB - r, r, 0, QUARTER_TURN, false);
  path.lineTo(minA + r, maxB);
  path.absarc(minA + r, maxB - r, r, QUARTER_TURN, 2 * QUARTER_TURN, false);
  path.lineTo(minA, minB + r);
  path.absarc(minA + r, minB + r, r, 2 * QUARTER_TURN, 3 * QUARTER_TURN, false);
  return path;
}

export function roundedRectShape(rect: Rect, radius: number): Shape {
  return traceRoundedRect(new Shape(), rect, radius);
}

export function roundedRectHole(rect: Rect, radius: number): Path {
  return traceRoundedRect(new Path(), rect, radius);
}

export function planShape(points: readonly PlanPoint[]): Shape {
  return new Shape(points.map((point) => new Vector2(point.x, point.z)));
}

export function planHole(points: readonly PlanPoint[]): Path {
  return new Path(points.map((point) => new Vector2(point.x, point.z)));
}

export function aroundHook(hookDegrees: number, radius: number): PlanPoint {
  const radians = toRadians(hookDegrees);
  return { x: -radius * Math.sin(radians), z: -radius * Math.cos(radians) };
}

export function hookSectorPoints(
  from: number,
  to: number,
  inner: number,
  outer: number,
  steps: number,
): PlanPoint[] {
  const outerEdge = Array.from({ length: steps + 1 }, (_, index) =>
    aroundHook(from + ((to - from) * index) / steps, outer),
  );
  const innerEdge = Array.from({ length: steps + 1 }, (_, index) =>
    aroundHook(to - ((to - from) * index) / steps, inner),
  );
  return [...outerEdge, ...innerEdge];
}

export function circlePoints(
  radius: number,
  steps: number,
  center: PlanPoint = { x: 0, z: 0 },
): PlanPoint[] {
  return Array.from({ length: steps }, (_, index) => {
    const angle = toRadians((360 * index) / steps);
    return { x: center.x + radius * Math.cos(angle), z: center.z + radius * Math.sin(angle) };
  });
}
