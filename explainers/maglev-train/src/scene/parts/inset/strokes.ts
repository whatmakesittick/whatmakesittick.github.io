import { BufferGeometry, CircleGeometry, Float32BufferAttribute, RingGeometry } from 'three';
import { mergeParts as merged } from '../line/geometry';

export { merged };

export type Point2 = readonly [x: number, y: number];

const CIRCLE_SEGMENTS = 28;
const POSITION = 'position';

function triangles(points: readonly Point2[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    POSITION,
    new Float32BufferAttribute(
      points.flatMap(([x, y]) => [x, y, 0]),
      3,
    ),
  );
  return geometry;
}

function quad(a: Point2, b: Point2, c: Point2, d: Point2): BufferGeometry {
  return triangles([a, b, c, a, c, d]);
}

export function rect(minX: number, minY: number, maxX: number, maxY: number): BufferGeometry {
  return quad([minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]);
}

export function triangle(a: Point2, b: Point2, c: Point2): BufferGeometry {
  return triangles([a, b, c]);
}

export function segment(a: Point2, b: Point2, width: number): BufferGeometry {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const along: Point2 = [
    ((b[0] - a[0]) / length) * (width / 2),
    ((b[1] - a[1]) / length) * (width / 2),
  ];
  const across: Point2 = [-along[1], along[0]];
  const start: Point2 = [a[0] - along[0], a[1] - along[1]];
  const end: Point2 = [b[0] + along[0], b[1] + along[1]];
  return quad(
    [start[0] - across[0], start[1] - across[1]],
    [end[0] - across[0], end[1] - across[1]],
    [end[0] + across[0], end[1] + across[1]],
    [start[0] + across[0], start[1] + across[1]],
  );
}

export function polyline(points: readonly Point2[], width: number, closed = false): BufferGeometry {
  const ends = closed ? [...points, points[0]] : points;
  return merged(ends.slice(1).map((point, index) => segment(ends[index], point, width)));
}

export function dashed(
  a: Point2,
  b: Point2,
  width: number,
  dash: number,
  gap: number,
): BufferGeometry {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const step = dash + gap;
  const count = Math.max(1, Math.floor((length + gap) / step));
  const at = (distance: number): Point2 => [
    a[0] + ((b[0] - a[0]) * distance) / length,
    a[1] + ((b[1] - a[1]) * distance) / length,
  ];
  return merged(
    Array.from({ length: count }, (_, index) =>
      segment(at(index * step), at(Math.min(length, index * step + dash)), width),
    ),
  );
}

export function disc([x, y]: Point2, radius: number, sides = CIRCLE_SEGMENTS): BufferGeometry {
  return new CircleGeometry(radius, sides).translate(x, y, 0);
}

export function ring([x, y]: Point2, inner: number, outer: number): BufferGeometry {
  return new RingGeometry(inner, outer, CIRCLE_SEGMENTS).translate(x, y, 0);
}
