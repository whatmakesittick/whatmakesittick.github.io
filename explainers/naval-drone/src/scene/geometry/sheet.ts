import { LatheGeometry, Vector2, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeParts } from '../parts/context';
import type { Pair } from './hullLines';
import { flatPolygon } from './flat';
import { flipWinding, gridSurface } from './surface';
import type { Vec3 } from './surface';

export type ProfilePoint = readonly [axial: number, radius: number, smooth?: boolean];
export type Arc = 'full' | 'starboard' | 'port';

const ARCS: Readonly<Record<Arc, readonly [number, number]>> = {
  full: [0, Math.PI * 2],
  starboard: [-Math.PI / 2, Math.PI],
  port: [Math.PI / 2, Math.PI],
};

function crisp(profile: readonly ProfilePoint[]): Vector2[] {
  return profile.flatMap(([axial, radius, smooth], index) => {
    const point = new Vector2(Math.max(radius, 0), axial);
    const corner = !smooth && index > 0 && index < profile.length - 1;
    return corner ? [point, point.clone()] : [point];
  });
}

export function turned(
  profile: readonly ProfilePoint[],
  segments: number,
  arc: Arc = 'full',
): BufferGeometry {
  const [start, length] = ARCS[arc];
  const geometry = new LatheGeometry(crisp(profile), segments, start, length);
  geometry.rotateZ(-Math.PI / 2);
  return geometry;
}

export function turnedCaps(profile: readonly ProfilePoint[]): BufferGeometry {
  const outline = (sign: number): Pair[] =>
    profile.map(([axial, radius]): Pair => [axial, sign * Math.max(radius, 0)]);
  const place = (a: number, b: number): Vec3 => [a, b, 0];
  return mergeParts([flatPolygon(outline(1), place), flatPolygon(outline(-1), place)]);
}

function gridNormals(grid: readonly (readonly Vec3[])[]): Vector3[][] {
  const at = (i: number, j: number) => new Vector3(...grid[i][j]);
  const rows = grid.length;
  const columns = grid[0].length;
  return grid.map((row, i) =>
    row.map((_, j) => {
      const across = at(Math.min(i + 1, rows - 1), j).sub(at(Math.max(i - 1, 0), j));
      const along = at(i, Math.min(j + 1, columns - 1)).sub(at(i, Math.max(j - 1, 0)));
      return across.cross(along).normalize();
    }),
  );
}

export function thickSheet(grid: readonly (readonly Vec3[])[], thickness: number): BufferGeometry {
  const normals = gridNormals(grid);
  const shifted = (sign: number) =>
    grid.map((row, i) =>
      row.map((point, j): Vec3 => {
        const n = normals[i][j];
        const half = (sign * thickness) / 2;
        return [point[0] + n.x * half, point[1] + n.y * half, point[2] + n.z * half];
      }),
    );
  const top = shifted(1);
  const bottom = shifted(-1);
  const last = grid.length - 1;
  const end = grid[0].length - 1;
  const rim = (pick: (side: Vec3[][]) => Vec3[]) => gridSurface([pick(top), pick(bottom)]);
  const edges = [
    rim((side) => side[0]),
    flipWinding(rim((side) => side[last])),
    flipWinding(rim((side) => side.map((row) => row[0]))),
    rim((side) => side.map((row) => row[end])),
  ];
  return mergeParts([gridSurface(top), flipWinding(gridSurface(bottom)), ...edges]);
}
