import { CatmullRomCurve3, Vector2, Vector3 } from 'three';

export type Flat = readonly [x: number, y: number];

const MIN_SAMPLES = 2;

export function smoothChain(points: readonly Flat[], step: number): Vector2[] {
  if (points.length < 3) return points.map(([x, y]) => new Vector2(x, y));
  const curve = new CatmullRomCurve3(
    points.map(([x, y]) => new Vector3(x, y, 0)),
    false,
    'centripetal',
  );
  const samples = Math.max(MIN_SAMPLES, Math.ceil(curve.getLength() / step));
  return curve.getSpacedPoints(samples).map((point) => new Vector2(point.x, point.y));
}

export function straight(from: Flat, to: Flat, step: number): Vector2[] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const samples = Math.max(1, Math.ceil(length / step));
  return Array.from({ length: samples + 1 }, (_, index) => {
    const share = index / samples;
    return new Vector2(from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share);
  });
}

export interface Edge {
  readonly points: Vector2[];
  readonly outer: boolean;
}

export function joinLoop(edges: readonly Edge[]): { points: Vector2[]; outer: boolean[] } {
  const points: Vector2[] = [];
  const outer: boolean[] = [];
  edges.forEach((edge) => {
    edge.points.slice(0, -1).forEach((point) => {
      points.push(point);
      outer.push(edge.outer);
    });
  });
  return { points, outer };
}
