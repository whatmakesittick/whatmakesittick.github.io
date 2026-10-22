import { Path, Shape, Vector2 } from 'three';
import { roundedRectShape } from '@core/scene/geometry/extrude';
import type { Rect } from '@core/scene/geometry/extrude';
import type { Point2 } from '../inset/strokes';

export interface BodyOutline {
  readonly halfWidth: number;
  readonly height: number;
  readonly bottomHalf: number;
  readonly bottomRise: number;
  readonly shoulder: number;
  readonly roofHalf: number;
}

const CURVE_DIVISIONS = 10;
const ROOF_PULL = 0.55;
const SAME_POINT = 1e-9;

function samePoint(a: Point2, b: Point2): boolean {
  return Math.abs(a[0] - b[0]) < SAME_POINT && Math.abs(a[1] - b[1]) < SAME_POINT;
}

export function distinct(points: readonly Point2[]): Point2[] {
  return points.filter((point, index) => index === 0 || !samePoint(point, points[index - 1]));
}

export function halfOutline(outline: BodyOutline): Point2[] {
  const { halfWidth, height, bottomHalf, bottomRise, shoulder, roofHalf } = outline;
  const path = new Path();
  path.moveTo(0, 0);
  path.lineTo(bottomHalf, 0);
  path.quadraticCurveTo(halfWidth, 0, halfWidth, bottomRise);
  path.lineTo(halfWidth, shoulder);
  path.bezierCurveTo(
    halfWidth,
    shoulder + (height - shoulder) * ROOF_PULL,
    roofHalf + (halfWidth - roofHalf) * ROOF_PULL,
    height,
    roofHalf,
    height,
  );
  path.lineTo(0, height);
  return distinct(path.getPoints(CURVE_DIVISIONS).map((point): Point2 => [point.x, point.y]));
}

export function mirrored(half: readonly Point2[]): Point2[] {
  const left = half
    .slice(1, -1)
    .reverse()
    .map(([a, y]): Point2 => [-a, y]);
  return [...half, ...left];
}

function crossing(a: Point2, b: Point2, y: number): Point2 {
  const share = b[1] === a[1] ? 0 : (y - a[1]) / (b[1] - a[1]);
  return [a[0] + (b[0] - a[0]) * share, y];
}

export function between(half: readonly Point2[], from: number, to: number): Point2[] {
  const inside = half.filter(([, y]) => y > from && y < to);
  const first = half.findIndex(([, y]) => y >= from);
  const last = half.findIndex(([, y]) => y >= to);
  const start = first > 0 ? crossing(half[first - 1], half[first], from) : half[0];
  const end = last > 0 ? crossing(half[last - 1], half[last], to) : half[half.length - 1];
  return distinct([start, ...inside, end]);
}

function edgeNormal(a: Point2, b: Point2): Point2 {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[1] - a[1]) / length, -(b[0] - a[0]) / length];
}

export function offset(points: readonly Point2[], distance: number): Point2[] {
  return points.map((point, index) => {
    const before = index > 0 ? edgeNormal(points[index - 1], point) : null;
    const after = index < points.length - 1 ? edgeNormal(point, points[index + 1]) : null;
    const sum: Point2 = [
      (before?.[0] ?? 0) + (after?.[0] ?? 0),
      (before?.[1] ?? 0) + (after?.[1] ?? 0),
    ];
    const length = Math.hypot(sum[0], sum[1]) || 1;
    return [point[0] + (sum[0] / length) * distance, point[1] + (sum[1] / length) * distance];
  });
}

export function widthAt(half: readonly Point2[], y: number): number {
  const index = half.findIndex(([, height], at) => at > 0 && height >= y && half[at - 1][1] < y);
  return index > 0 ? crossing(half[index - 1], half[index], y)[0] : 0;
}

export function lifted(points: readonly Point2[], by: number): Point2[] {
  return points.map(([a, y]): Point2 => [a, y + by]);
}

export function shapeOf(points: readonly Point2[]): Shape {
  return new Shape(points.map(([a, y]) => new Vector2(a, y)));
}

export function band(
  half: readonly Point2[],
  from: number,
  to: number,
  thickness: number,
): Point2[] {
  const inner = offset(between(half, from, to), thickness * 0.15);
  const outer = offset(between(half, from, to), thickness);
  return [...inner, ...outer.reverse()];
}

const ROUNDED_DIVISIONS = 4;

export function roundedRect(rect: Rect, radius: number): Point2[] {
  const points = roundedRectShape(rect, radius).getPoints(ROUNDED_DIVISIONS);
  return distinct(points.map((point): Point2 => [point.x, point.y]));
}
