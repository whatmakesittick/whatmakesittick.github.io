import { Path, Shape, Vector2 } from 'three';
import { CURVE_SEGMENTS } from '../constants';

export interface Opening {
  center: number;
  radius: number;
}

export interface SectionProfile {
  boundary: Vector2[];
  openings: readonly Opening[];
}

const FULL_TURN = Math.PI * 2;

export function arcPoints(
  center: Vector2,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments = CURVE_SEGMENTS,
): Vector2[] {
  const steps = Math.max(2, Math.ceil((segments * Math.abs(endAngle - startAngle)) / FULL_TURN));
  const points: Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + ((endAngle - startAngle) * i) / steps;
    points.push(
      new Vector2(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle)),
    );
  }
  return points;
}

export function circlePath(center: Vector2, radius: number): Path {
  const path = new Path();
  path.absarc(center.x, center.y, radius, 0, FULL_TURN, false);
  return path;
}

export function fromLeftHalfXY(points: readonly Vector2[]): Vector2[] {
  return points.map((point) => new Vector2(point.y, -point.x));
}

function notchPoints(opening: Opening, travellingNegative: boolean): Vector2[] {
  const center = new Vector2(opening.center, 0);
  return travellingNegative
    ? arcPoints(center, opening.radius, 0, Math.PI)
    : arcPoints(center, opening.radius, Math.PI, 0);
}

function cutLineClosure(from: Vector2, to: Vector2, openings: readonly Opening[]): Vector2[] {
  const travellingNegative = to.x < from.x;
  const ordered = [...openings].sort((a, b) =>
    travellingNegative ? b.center - a.center : a.center - b.center,
  );
  return ordered.flatMap((opening) => notchPoints(opening, travellingNegative));
}

export function halfShape(profile: SectionProfile): Shape {
  const { boundary, openings } = profile;
  const closure = cutLineClosure(boundary[boundary.length - 1], boundary[0], openings);
  return new Shape([...boundary, ...closure]);
}

function mirrored(points: readonly Vector2[]): Vector2[] {
  return points.map((point) => new Vector2(point.x, -point.y));
}

export function fullShape(profile: SectionProfile): Shape {
  const { boundary, openings } = profile;
  const mirror = mirrored(boundary).reverse().slice(1, -1);
  const shape = new Shape([...boundary, ...mirror]);
  shape.holes = openings.map((opening) =>
    circlePath(new Vector2(opening.center, 0), opening.radius),
  );
  return shape;
}

function shortestSweep(angle: number): number {
  if (angle > Math.PI) return angle - FULL_TURN;
  if (angle < -Math.PI) return angle + FULL_TURN;
  return angle;
}

export function roundedCorner(
  corner: Vector2,
  previous: Vector2,
  next: Vector2,
  radius: number,
): Vector2[] {
  const toPrevious = previous.clone().sub(corner).normalize();
  const toNext = next.clone().sub(corner).normalize();
  const halfAngle = Math.acos(Math.min(1, Math.max(-1, toPrevious.dot(toNext)))) / 2;
  const tangentDistance = radius / Math.tan(halfAngle);
  const start = corner.clone().addScaledVector(toPrevious, tangentDistance);
  const end = corner.clone().addScaledVector(toNext, tangentDistance);
  const bisector = toPrevious.clone().add(toNext).normalize();
  const center = corner.clone().addScaledVector(bisector, radius / Math.sin(halfAngle));
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
  const sweep = shortestSweep(endAngle - startAngle);
  return arcPoints(center, radius, startAngle, startAngle + sweep, CURVE_SEGMENTS / 2);
}

export function roundCorners(
  points: readonly Vector2[],
  radii: ReadonlyMap<number, number>,
): Vector2[] {
  return points.flatMap((point, index) => {
    const radius = radii.get(index);
    if (radius === undefined) return [point];
    return roundedCorner(point, points[index - 1], points[index + 1], radius);
  });
}
