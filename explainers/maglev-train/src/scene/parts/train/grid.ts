import { cross, dot, mirrorZ, normalize, sub } from './mesh';
import type { RegionBuilders } from './mesh';
import type { Vec3 } from './nose';

export type GridPoints = readonly (readonly Vec3[])[];
export type RegionOf<R> = (station: number, row: number) => R | null;

const DEGENERATE = 1e-12;
const SIDES = [1, -1] as const;

function at(points: GridPoints, station: number, row: number): Vec3 {
  const column = points[Math.max(0, Math.min(points.length - 1, station))];
  return column[Math.max(0, Math.min(column.length - 1, row))];
}

export interface CentreRows {
  readonly first: boolean;
  readonly last: boolean;
  readonly station?: (station: number) => boolean;
}

const BOTH_CENTRED: CentreRows = { first: true, last: true };

export function gridNormals(
  points: GridPoints,
  fallback: (station: number) => Vec3,
  centred: CentreRows = BOTH_CENTRED,
): Vec3[][] {
  const lastRow = points[0].length - 1;
  return points.map((column, station) =>
    column.map((_, row) => {
      const along = sub(at(points, station + 1, row), at(points, station - 1, row));
      const across = sub(at(points, station, row + 1), at(points, station, row - 1));
      let normal = cross(along, across);
      if (dot(normal, normal) < DEGENERATE) return fallback(station);
      const onCentre =
        (row === 0 && centred.first) ||
        (row === lastRow && centred.last) ||
        Boolean(centred.station?.(station));
      if (onCentre) normal = [normal[0], normal[1], 0];
      return normalize(normal);
    }),
  );
}

export function emitGrid<R extends string>(
  builders: RegionBuilders<R>,
  points: GridPoints,
  normals: readonly (readonly Vec3[])[],
  regionOf: RegionOf<R>,
  tag: string,
): void {
  SIDES.forEach((side) => {
    const place = (v: Vec3): Vec3 => (side > 0 ? v : mirrorZ(v));
    for (let station = 0; station < points.length - 1; station += 1) {
      for (let row = 0; row < points[station].length - 1; row += 1) {
        const region = regionOf(station, row);
        if (region === null) continue;
        const builder = builders.of(region);
        const corner = (i: number, j: number) =>
          builder.vertex(place(points[i][j]), place(normals[i][j]), `${tag}:${side}:${i}:${j}`);
        const [a, b, c, d] = [
          corner(station, row),
          corner(station + 1, row),
          corner(station + 1, row + 1),
          corner(station, row + 1),
        ];
        if (side > 0) {
          builder.triangle(a, b, c);
          builder.triangle(a, c, d);
        } else {
          builder.triangle(a, c, b);
          builder.triangle(a, d, c);
        }
      }
    }
  });
}
