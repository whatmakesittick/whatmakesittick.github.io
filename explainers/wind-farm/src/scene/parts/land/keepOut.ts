import type { GroundPoint } from '../../../model/layout';

export interface KeepOutDisc {
  readonly centre: GroundPoint;
  readonly radius: number;
}

export interface KeepOutCorridor {
  readonly points: readonly GroundPoint[];
  readonly radius: number;
}

export interface KeepOut {
  readonly discs: readonly KeepOutDisc[];
  readonly corridors: readonly KeepOutCorridor[];
}

function distanceToSegment(x: number, z: number, from: GroundPoint, to: GroundPoint): number {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const lengthSquared = dx * dx + dz * dz;
  const share =
    lengthSquared > 0
      ? Math.min(1, Math.max(0, ((x - from[0]) * dx + (z - from[1]) * dz) / lengthSquared))
      : 0;
  return Math.hypot(x - from[0] - dx * share, z - from[1] - dz * share);
}

export function distanceToPolyline(points: readonly GroundPoint[], x: number, z: number): number {
  let nearest = Infinity;
  for (let index = 1; index < points.length; index += 1)
    nearest = Math.min(nearest, distanceToSegment(x, z, points[index - 1], points[index]));
  return nearest;
}

export function isClear(keepOut: KeepOut, x: number, z: number): boolean {
  const discHit = keepOut.discs.some(
    ({ centre, radius }) => Math.hypot(x - centre[0], z - centre[1]) < radius,
  );
  if (discHit) return false;
  return keepOut.corridors.every(
    ({ points, radius }) => distanceToPolyline(points, x, z) >= radius,
  );
}
