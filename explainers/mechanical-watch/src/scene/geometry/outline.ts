import { toRadians } from '@core/math';

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface Circle {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

const FULL_CIRCLE = Math.PI * 2;
const EPSILON = 1e-9;

export function polar(centre: Vec2, radius: number, radians: number): Vec2 {
  return { x: centre.x + radius * Math.cos(radians), y: centre.y + radius * Math.sin(radians) };
}

export function polarDeg(centre: Vec2, radius: number, degrees: number): Vec2 {
  return polar(centre, radius, toRadians(degrees));
}

export function rotateAbout(point: Vec2, pivot: Vec2, radians: number): Vec2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function angleOf(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function signedArea(points: readonly Vec2[]): number {
  let area = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    area += point.x * next.y - next.x * point.y;
  });
  return area / 2;
}

export function counterClockwise(points: readonly Vec2[]): Vec2[] {
  return signedArea(points) < 0 ? [...points].reverse() : [...points];
}

export function arcPoints(
  centre: Vec2,
  radius: number,
  start: number,
  end: number,
  segments: number,
): Vec2[] {
  return Array.from({ length: segments + 1 }, (_, index) =>
    polar(centre, radius, start + ((end - start) * index) / segments),
  );
}

export function circlePoints(circle: Circle, segments: number): Vec2[] {
  return arcPoints(circle, circle.r, 0, FULL_CIRCLE, segments).slice(0, segments);
}

function cross(origin: Vec2, a: Vec2, b: Vec2): number {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}

export function convexHull(points: readonly Vec2[]): Vec2[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const half = (list: readonly Vec2[]) => {
    const chain: Vec2[] = [];
    list.forEach((point) => {
      while (
        chain.length >= 2 &&
        cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0
      )
        chain.pop();
      chain.push(point);
    });
    chain.pop();
    return chain;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

export function hullOfCircles(circles: readonly Circle[], segments: number): Vec2[] {
  return convexHull(circles.flatMap((circle) => circlePoints(circle, segments)));
}

export function isInsideCircle(point: Vec2, circle: Circle): boolean {
  return distance(point, circle) < circle.r - EPSILON;
}

function edgeCrossings(from: Vec2, to: Vec2, circle: Circle): Vec2[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const fx = from.x - circle.x;
  const fy = from.y - circle.y;
  const qa = dx * dx + dy * dy;
  const qb = 2 * (fx * dx + fy * dy);
  const qc = fx * fx + fy * fy - circle.r * circle.r;
  const discriminant = qb * qb - 4 * qa * qc;
  if (qa === 0 || discriminant <= 0) return [];
  const root = Math.sqrt(discriminant);
  return [(-qb - root) / (2 * qa), (-qb + root) / (2 * qa)]
    .filter((t) => t > 0 && t <= 1)
    .map((t) => ({ x: from.x + dx * t, y: from.y + dy * t }));
}

function shortestTurn(from: number, to: number, clockwise: boolean): number {
  let delta = to - from;
  if (clockwise) while (delta > 0) delta -= FULL_CIRCLE;
  else while (delta < 0) delta += FULL_CIRCLE;
  return delta;
}

function cutArc(circle: Circle, entry: Vec2, exit: Vec2, segments: number): Vec2[] {
  const from = angleOf(circle, entry);
  const sweep = shortestTurn(from, angleOf(circle, exit), true);
  const steps = Math.max(2, Math.ceil((Math.abs(sweep) / FULL_CIRCLE) * segments));
  return arcPoints(circle, circle.r, from, from + sweep, steps);
}

export function subtractCircle(polygon: readonly Vec2[], circle: Circle, segments: number): Vec2[] {
  const outline = counterClockwise(polygon);
  const start = outline.findIndex((point) => !isInsideCircle(point, circle));
  if (start < 0) return [];
  const ordered = [...outline.slice(start), ...outline.slice(0, start)];
  const result: Vec2[] = [];
  let entry: Vec2 | null = null;
  ordered.forEach((point, index) => {
    if (!entry) result.push(point);
    edgeCrossings(point, ordered[(index + 1) % ordered.length], circle).forEach((hit) => {
      if (!entry) {
        entry = hit;
        return;
      }
      result.push(...cutArc(circle, entry, hit, segments));
      entry = null;
    });
  });
  return result;
}

function unionArc(own: Circle, other: Circle, segments: number): Vec2[] {
  const gap = distance(own, other);
  const cosine = (own.r * own.r + gap * gap - other.r * other.r) / (2 * own.r * gap);
  const spread = Math.acos(Math.min(1, Math.max(-1, cosine)));
  const towards = angleOf(own, other);
  const start = towards + spread;
  const end = towards + FULL_CIRCLE - spread;
  const steps = Math.max(2, Math.ceil(((end - start) / FULL_CIRCLE) * segments));
  return arcPoints(own, own.r, start, end, steps);
}

export function circleUnion(a: Circle, b: Circle, segments: number): Vec2[] {
  const gap = distance(a, b);
  if (gap >= a.r + b.r) throw new Error('Circles do not overlap');
  if (gap + Math.min(a.r, b.r) <= Math.max(a.r, b.r)) {
    return circlePoints(a.r >= b.r ? a : b, segments);
  }
  const first = unionArc(a, b, segments);
  const second = unionArc(b, a, segments);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

export function annularSector(
  centre: Vec2,
  inner: number,
  outer: number,
  start: number,
  end: number,
  segments: number,
): Vec2[] {
  const steps = Math.max(2, Math.ceil(((end - start) / FULL_CIRCLE) * segments));
  return [
    ...arcPoints(centre, outer, start, end, steps),
    ...arcPoints(centre, inner, end, start, steps),
  ];
}

function lerpPoint(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function cornerTurn(previous: Vec2, point: Vec2, next: Vec2): number {
  const a = angleOf(previous, point);
  const b = angleOf(point, next);
  let turn = b - a;
  while (turn > Math.PI) turn -= FULL_CIRCLE;
  while (turn < -Math.PI) turn += FULL_CIRCLE;
  return turn;
}

function filletCorner(
  previous: Vec2,
  point: Vec2,
  next: Vec2,
  radius: number,
  segments: number,
): Vec2[] {
  const turn = cornerTurn(previous, point, next);
  const setback = Math.min(
    radius * Math.tan(Math.abs(turn) / 2),
    distance(previous, point) / 2,
    distance(point, next) / 2,
  );
  const from = lerpPoint(point, previous, setback / distance(point, previous));
  const to = lerpPoint(point, next, setback / distance(point, next));
  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const a = lerpPoint(from, point, t);
    const b = lerpPoint(point, to, t);
    return lerpPoint(a, b, t);
  });
}

export function roundCorners(
  polygon: readonly Vec2[],
  radius: number,
  minTurnDeg: number,
  segments: number,
): Vec2[] {
  const minTurn = toRadians(minTurnDeg);
  return polygon.flatMap((point, index) => {
    const previous = polygon[(index - 1 + polygon.length) % polygon.length];
    const next = polygon[(index + 1) % polygon.length];
    if (Math.abs(cornerTurn(previous, point, next)) < minTurn) return [point];
    return filletCorner(previous, point, next, radius, segments);
  });
}

export function offsetPolyline(points: readonly Vec2[], halfWidth: number): Vec2[] {
  const side = (sign: number) =>
    points.map((point, index) => {
      const before = points[Math.max(0, index - 1)];
      const after = points[Math.min(points.length - 1, index + 1)];
      const heading = angleOf(before, after);
      return polar(point, halfWidth * sign, heading + Math.PI / 2);
    });
  return [...side(1), ...side(-1).reverse()];
}

export function smoothOutline(points: readonly Vec2[], samplesPerSpan: number): Vec2[] {
  const count = points.length;
  const at = (index: number) => points[((index % count) + count) % count];
  return points.flatMap((_, index) => {
    const p0 = at(index - 1);
    const p1 = at(index);
    const p2 = at(index + 1);
    const p3 = at(index + 2);
    return Array.from({ length: samplesPerSpan }, (__, step) => {
      const t = step / samplesPerSpan;
      const t2 = t * t;
      const t3 = t2 * t;
      const blend = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      return { x: blend(p0.x, p1.x, p2.x, p3.x), y: blend(p0.y, p1.y, p2.y, p3.y) };
    });
  });
}

export function alongAxis(origin: Vec2, towards: Vec2, points: readonly Vec2[]): Vec2[] {
  const heading = angleOf(origin, towards);
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  return points.map((point) => ({
    x: origin.x + point.x * cos - point.y * sin,
    y: origin.y + point.x * sin + point.y * cos,
  }));
}
