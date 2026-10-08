import type { GroundPoint } from '../../../model/layout';
import type { Random } from './random';

export type Polygon = readonly GroundPoint[];

export interface Extents {
  readonly along: readonly [number, number];
  readonly across: readonly [number, number];
}

export interface Cut {
  readonly sides: readonly [Polygon, Polygon];
  readonly chord: readonly [GroundPoint, GroundPoint];
}

const MIN_CHORD_POINTS = 2;

export function centroid(polygon: Polygon): GroundPoint {
  const [x, z] = polygon.reduce(([sumX, sumZ], [px, pz]) => [sumX + px, sumZ + pz], [0, 0]);
  return [x / polygon.length, z / polygon.length];
}

function triangleArea(a: GroundPoint, b: GroundPoint, c: GroundPoint): number {
  return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
}

export function polygonArea(polygon: Polygon): number {
  let area = 0;
  for (let index = 2; index < polygon.length; index += 1)
    area += triangleArea(polygon[0], polygon[index - 1], polygon[index]);
  return area;
}

export function extents(polygon: Polygon, angle: number): Extents {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const along = polygon.map(([x, z]) => x * cos + z * sin);
  const across = polygon.map(([x, z]) => z * cos - x * sin);
  return {
    along: [Math.min(...along), Math.max(...along)],
    across: [Math.min(...across), Math.max(...across)],
  };
}

function crossing(a: GroundPoint, b: GroundPoint, da: number, db: number): GroundPoint {
  const share = da / (da - db);
  return [a[0] + (b[0] - a[0]) * share, a[1] + (b[1] - a[1]) * share];
}

export function cutPolygon(
  polygon: Polygon,
  origin: GroundPoint,
  normal: GroundPoint,
): Cut | undefined {
  const front: GroundPoint[] = [];
  const back: GroundPoint[] = [];
  const chord: GroundPoint[] = [];
  const side = ([x, z]: GroundPoint) => (x - origin[0]) * normal[0] + (z - origin[1]) * normal[1];
  polygon.forEach((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    const [here, there] = [side(point), side(next)];
    (here >= 0 ? front : back).push(point);
    if (here >= 0 === there >= 0) return;
    const hit = crossing(point, next, here, there);
    front.push(hit);
    back.push(hit);
    chord.push(hit);
  });
  if (chord.length < MIN_CHORD_POINTS) return undefined;
  return { sides: [front, back], chord: [chord[0], chord[1]] };
}

export function pointInPolygon(polygon: Polygon, random: Random): GroundPoint {
  const areas = polygon
    .slice(2)
    .map((point, index) => triangleArea(polygon[0], polygon[index + 1], point));
  let pick = random() * areas.reduce((sum, area) => sum + area, 0);
  const triangle = Math.max(
    0,
    areas.findIndex((area) => (pick -= area) <= 0),
  );
  const [a, b, c] = [polygon[0], polygon[triangle + 1], polygon[triangle + 2]];
  let [s, t] = [random(), random()];
  if (s + t > 1) [s, t] = [1 - s, 1 - t];
  return [
    a[0] + (b[0] - a[0]) * s + (c[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * s + (c[1] - a[1]) * t,
  ];
}

export function pointAlong(from: GroundPoint, to: GroundPoint, share: number): GroundPoint {
  return [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share];
}
