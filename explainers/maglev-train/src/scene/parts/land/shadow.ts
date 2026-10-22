import { SUN_DIRECTION } from '../../constants';

export type GroundPoint = readonly [x: number, z: number];

const [SUN_X, SUN_Y, SUN_Z] = SUN_DIRECTION;

export const SHADOW_SLOPE: GroundPoint = [-SUN_X / SUN_Y, -SUN_Z / SUN_Y];

export function groundShadow(x: number, y: number, z: number): GroundPoint {
  return [x + y * SHADOW_SLOPE[0], z + y * SHADOW_SLOPE[1]];
}

function cross(origin: GroundPoint, a: GroundPoint, b: GroundPoint): number {
  return (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0]);
}

function halfHull(points: readonly GroundPoint[]): GroundPoint[] {
  const hull: GroundPoint[] = [];
  points.forEach((point) => {
    while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0)
      hull.pop();
    hull.push(point);
  });
  hull.pop();
  return hull;
}

export function convexHull(points: readonly GroundPoint[]): GroundPoint[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return [...halfHull(sorted), ...halfHull([...sorted].reverse())];
}

export interface Prism {
  readonly x: readonly [number, number];
  readonly y: readonly [number, number];
  readonly z: readonly [number, number];
}

export function prismShadow({ x, y, z }: Prism): GroundPoint[] {
  const corners = x.flatMap((atX) =>
    y.flatMap((atY) => z.map((atZ) => groundShadow(atX, atY, atZ))),
  );
  return convexHull(corners);
}

export function shadowBand(
  z: readonly [number, number],
  y: readonly [number, number],
): [number, number] {
  const ends = z.flatMap((atZ) => y.map((atY) => groundShadow(0, atY, atZ)[1]));
  return [Math.min(...ends), Math.max(...ends)];
}
