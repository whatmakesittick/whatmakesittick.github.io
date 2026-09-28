import { CurvePath, LineCurve3, QuadraticBezierCurve3, Vector3 } from 'three';

export type RoutePoint = readonly [x: number, y: number, z: number];

export function toVectors(points: readonly RoutePoint[]): Vector3[] {
  return points.map(([x, y, z]) => new Vector3(x, y, z));
}

function towards(from: Vector3, to: Vector3, distance: number): Vector3 {
  const length = from.distanceTo(to);
  if (length === 0) return from.clone();
  return from.clone().lerp(to, Math.min(distance, length) / length);
}

export function roundedRoute(points: readonly Vector3[], radius: number): CurvePath<Vector3> {
  const path = new CurvePath<Vector3>();
  if (points.length < 2) return path;
  let start = points[0].clone();
  for (let index = 1; index < points.length - 1; index += 1) {
    const corner = points[index];
    const before = points[index - 1];
    const after = points[index + 1];
    const reach = Math.min(radius, corner.distanceTo(before) / 2, corner.distanceTo(after) / 2);
    const entry = towards(corner, before, reach);
    const exit = towards(corner, after, reach);
    if (start.distanceTo(entry) > 0) path.add(new LineCurve3(start, entry));
    path.add(new QuadraticBezierCurve3(entry, corner.clone(), exit));
    start = exit;
  }
  path.add(new LineCurve3(start, points[points.length - 1].clone()));
  return path;
}

export function routeLength(points: readonly Vector3[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += points[index].distanceTo(points[index - 1]);
  }
  return length;
}
