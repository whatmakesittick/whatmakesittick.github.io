import { INFLUENCES } from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';
import type { Model } from './topology.ts';
import { dot, length, mix, point, sub, type Vec } from './vec.ts';

const ON_PLANE = 5e-5;
const SNAP_RATIO = 0.25;
const GRADIENT_STEP = 1e-3;

export interface CutPlane {
  distance(position: Vec): number;
  applies(model: Model, vertex: number): boolean;
}

interface Influences {
  joints: number[];
  weights: number[];
}

function blendInfluences(model: Model, a: number, b: number, t: number): Influences {
  const total = new Map<number, number>();
  for (const [vertex, share] of [
    [a, 1 - t],
    [b, t],
  ]) {
    for (let k = 0; k < INFLUENCES; k++) {
      const bone = model.joints[vertex * INFLUENCES + k];
      total.set(bone, (total.get(bone) ?? 0) + model.weights[vertex * INFLUENCES + k] * share);
    }
  }
  const picked = [...total].sort((p, q) => q[1] - p[1] || p[0] - q[0]).slice(0, INFLUENCES);
  const sum = picked.reduce((acc, [, weight]) => acc + weight, 0);
  const joints = picked.map(([bone]) => bone);
  const weights = picked.map(([, weight]) => weight / sum);
  while (joints.length < INFLUENCES) {
    joints.push(joints[0]);
    weights.push(0);
  }
  return { joints, weights };
}

class VertexBuilder {
  readonly positions: number[];
  readonly joints: number[];
  readonly weights: number[];

  constructor(model: Model) {
    this.positions = Array.from(model.positions);
    this.joints = Array.from(model.joints);
    this.weights = Array.from(model.weights);
  }

  add(position: Vec, influences: Influences): number {
    this.positions.push(...position);
    this.joints.push(...influences.joints);
    this.weights.push(...influences.weights);
    return this.positions.length / 3 - 1;
  }

  build(triangles: number[]): Model {
    return {
      positions: Float64Array.from(this.positions),
      triangles,
      joints: Uint8Array.from(this.joints),
      weights: Float32Array.from(this.weights),
    };
  }
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a},${b}` : `${b},${a}`;
}

function snappedDistances(model: Model, plane: CutPlane): Float64Array {
  const count = model.positions.length / 3;
  const distances = new Float64Array(count);
  for (let v = 0; v < count; v++) {
    const d = plane.distance(point(model.positions, v));
    distances[v] = Math.abs(d) < ON_PLANE ? 0 : d;
  }
  return distances;
}

function gradient(plane: CutPlane, position: Vec): Vec {
  const base = plane.distance(position);
  return [0, 1, 2].map((k) => {
    const shifted = [...position] as Vec;
    shifted[k] += GRADIENT_STEP;
    return (plane.distance(shifted) - base) / GRADIENT_STEP;
  }) as Vec;
}

function snapToPlane(builder: VertexBuilder, plane: CutPlane, vertex: number): void {
  const position = point(builder.positions, vertex);
  const g = gradient(plane, position);
  const factor = plane.distance(position) / dot(g, g);
  const moved = position.map((value, k) => value - factor * g[k]);
  builder.positions.splice(vertex * 3, 3, moved[0], moved[1], position[2] === 0 ? 0 : moved[2]);
}

function snapNearVertices(
  model: Model,
  plane: CutPlane,
  allowed: readonly boolean[],
  builder: VertexBuilder,
): void {
  const distances = snappedDistances(model, plane);
  const snapped = new Set<number>();
  for (let i = 0; i < model.triangles.length; i++) {
    const [a, b] = [model.triangles[i], model.triangles[i - (i % 3) + ((i + 1) % 3)]];
    if (!(distances[a] * distances[b] < 0) || !allowed[a] || !allowed[b]) continue;
    const t = distances[a] / (distances[a] - distances[b]);
    if (t < SNAP_RATIO) snapped.add(a);
    else if (t > 1 - SNAP_RATIO) snapped.add(b);
  }
  snapped.forEach((vertex) => snapToPlane(builder, plane, vertex));
}

function splitPolygon(positions: ArrayLike<number>, polygon: number[]): number[] {
  if (polygon.length === 3) return polygon;
  const span = (i: number, j: number): number =>
    length(sub(point(positions, polygon[i]), point(positions, polygon[j])));
  const [p, q, r, s] = polygon;
  return span(0, 2) <= span(1, 3) ? [p, q, r, p, r, s] : [p, q, s, q, r, s];
}

function retriangulate(
  positions: ArrayLike<number>,
  polygon: number[],
  onPlane: number[],
): number[] {
  if (polygon.length === 3) return polygon;
  if (onPlane.length === 2) {
    const [from, to] = onPlane;
    const first = polygon.slice(from, to + 1);
    const second = [...polygon.slice(to), ...polygon.slice(0, from + 1)];
    return [...splitPolygon(positions, first), ...splitPolygon(positions, second)];
  }
  const at = (offset: number): number =>
    polygon[(onPlane[0] + offset + polygon.length) % polygon.length];
  return [at(-1), at(0), at(2), at(0), at(1), at(2)];
}

export function cutByPlane(source: Model, plane: CutPlane): Model {
  const count = source.positions.length / 3;
  const allowed = Array.from({ length: count }, (_, v) => plane.applies(source, v));
  const builder = new VertexBuilder(source);
  snapNearVertices(source, plane, allowed, builder);
  const model = builder.build(source.triangles);
  const distances = snappedDistances(model, plane);
  const inserted = new Map<string, number>();
  const crossing = (a: number, b: number): number | null => {
    if (!(distances[a] * distances[b] < 0) || !allowed[a] || !allowed[b]) return null;
    const key = edgeKey(a, b);
    if (!inserted.has(key)) {
      const t = distances[a] / (distances[a] - distances[b]);
      const position = mix(point(model.positions, a), point(model.positions, b), t);
      if (model.positions[a * 3 + 2] === 0 && model.positions[b * 3 + 2] === 0) position[2] = 0;
      inserted.set(key, builder.add(position, blendInfluences(model, a, b, t)));
    }
    return inserted.get(key)!;
  };

  const triangles: number[] = [];
  for (let i = 0; i < model.triangles.length; i += 3) {
    const corners = [model.triangles[i], model.triangles[i + 1], model.triangles[i + 2]];
    const polygon: number[] = [];
    const onPlane: number[] = [];
    corners.forEach((vertex, k) => {
      if (distances[vertex] === 0) onPlane.push(polygon.length);
      polygon.push(vertex);
      const cut = crossing(vertex, corners[(k + 1) % 3]);
      if (cut !== null) {
        onPlane.push(polygon.length);
        polygon.push(cut);
      }
    });
    triangles.push(...retriangulate(builder.positions, polygon, onPlane));
  }
  return builder.build(triangles);
}

export function cutMesh(model: Model, planes: readonly CutPlane[]): Model {
  return planes.reduce((current, plane) => cutByPlane(current, plane), model);
}
