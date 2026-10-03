import { BufferAttribute, BufferGeometry, ShapeUtils, Vector2 } from 'three';
import type { Pair } from './hullLines';
import type { Uv, Vec3 } from './surface';

export type Place = (a: number, b: number) => Vec3;

const XYZ = 3;
const MITER_LIMIT = 4;
const DISTINCT = 1e-6;

export function flatPolygon(
  outline: readonly Pair[],
  place: Place,
  holes: readonly (readonly Pair[])[] = [],
  uv?: (a: number, b: number) => Uv,
): BufferGeometry {
  const contour = outline.map(([a, b]) => new Vector2(a, b));
  const holePoints = holes.map((hole) => hole.map(([a, b]) => new Vector2(a, b)));
  const faces = ShapeUtils.triangulateShape(contour, holePoints);
  const all = [...contour, ...holePoints.flat()];
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array(all.flatMap((point) => [...place(point.x, point.y)])),
      XYZ,
    ),
  );
  geometry.setAttribute(
    'uv',
    new BufferAttribute(
      new Float32Array(all.flatMap((point) => [...(uv?.(point.x, point.y) ?? [point.x, point.y])])),
      2,
    ),
  );
  geometry.setIndex(faces.flat());
  geometry.computeVertexNormals();
  return geometry;
}

function distance(a: Pair, b: Pair): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function leftNormal(from: Pair, to: Pair): Pair {
  const length = distance(from, to);
  return [-(to[1] - from[1]) / length, (to[0] - from[0]) / length];
}

function neighbour(points: readonly Pair[], index: number, step: number): Pair | null {
  for (let at = index + step; at >= 0 && at < points.length; at += step) {
    if (distance(points[at], points[index]) > DISTINCT) return points[at];
  }
  return null;
}

export function offsetPolyline(points: readonly Pair[], amount: number): Pair[] {
  return points.map((point, index) => {
    const previous = neighbour(points, index, -1);
    const next = neighbour(points, index, 1);
    const before = previous ? leftNormal(previous, point) : null;
    const after = next ? leftNormal(point, next) : null;
    if (!before || !after) {
      const normal = before ?? after ?? [0, 0];
      return [point[0] + normal[0] * amount, point[1] + normal[1] * amount];
    }
    const sum: Pair = [before[0] + after[0], before[1] + after[1]];
    const length = Math.hypot(sum[0], sum[1]);
    if (length < DISTINCT) return [point[0] + after[0] * amount, point[1] + after[1] * amount];
    const miter: Pair = [sum[0] / length, sum[1] / length];
    const cosine = Math.max(miter[0] * after[0] + miter[1] * after[1], 1 / MITER_LIMIT);
    return [point[0] + (miter[0] * amount) / cosine, point[1] + (miter[1] * amount) / cosine];
  });
}

export function pinToAxis(inner: Pair, along: Pair): Pair {
  if (Math.abs(along[0]) < DISTINCT) return [0, inner[1]];
  return [0, inner[1] - (inner[0] * along[1]) / along[0]];
}

export function band(outer: readonly Pair[], amount: number): Pair[] {
  return [...outer, ...offsetPolyline(outer, amount).reverse()];
}
