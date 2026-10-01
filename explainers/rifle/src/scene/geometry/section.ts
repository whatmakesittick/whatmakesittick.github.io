import { Path, Shape, Vector2 } from 'three';

export type SectionPoint = readonly [z: number, y: number];

export interface Bore {
  y: number;
  radius: number;
}

export interface Section {
  rim: readonly SectionPoint[];
  bores?: readonly Bore[];
}

const BORE_STEPS = 32;
const SAME_POINT = 1e-6;
const QUARTER_TURN = Math.PI / 2;

export function arcPoints(
  [centreZ, centreY]: SectionPoint,
  radius: number,
  from: number,
  to: number,
  steps: number,
): SectionPoint[] {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = from + ((to - from) * index) / steps;
    return [centreZ + radius * Math.cos(angle), centreY + radius * Math.sin(angle)] as const;
  });
}

function samePoint(a: SectionPoint, b: SectionPoint): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) <= SAME_POINT;
}

function distinct(points: readonly SectionPoint[]): SectionPoint[] {
  const result: SectionPoint[] = [];
  for (const point of points) {
    const last = result[result.length - 1];
    if (!last || !samePoint(last, point)) result.push(point);
  }
  if (result.length > 1 && samePoint(result[0], result[result.length - 1])) result.pop();
  return result;
}

function toVectors(points: readonly SectionPoint[]): Vector2[] {
  return points.map(([z, y]) => new Vector2(z, y));
}

function mirrored(points: readonly SectionPoint[]): SectionPoint[] {
  return points.map(([z, y]) => [-z, y] as const).reverse();
}

function boreCircle(bore: Bore): SectionPoint[] {
  return arcPoints([0, bore.y], bore.radius, 0, Math.PI * 2, BORE_STEPS).slice(0, -1);
}

function boreNotch(bore: Bore): SectionPoint[] {
  return arcPoints([0, bore.y], bore.radius, -QUARTER_TURN, -3 * QUARTER_TURN, BORE_STEPS / 2);
}

export function wholeSectionShape(section: Section): Shape {
  const shape = new Shape(toVectors(distinct([...section.rim, ...mirrored(section.rim)])));
  for (const bore of section.bores ?? []) shape.holes.push(new Path(toVectors(boreCircle(bore))));
  return shape;
}

export function keptSectionShape(section: Section): Shape {
  const { rim } = section;
  const top = rim[0][1];
  const bottom = rim[rim.length - 1][1];
  const notches = [...(section.bores ?? [])]
    .filter((bore) => bore.y - bore.radius > bottom && bore.y + bore.radius < top)
    .sort((a, b) => a.y - b.y)
    .flatMap(boreNotch);
  return new Shape(toVectors(distinct([...rim, ...notches])));
}
