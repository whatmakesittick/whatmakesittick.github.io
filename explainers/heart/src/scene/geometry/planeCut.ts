import { BufferAttribute, BufferGeometry } from 'three';
import type { Vec3 } from './field';

export interface CutPlane {
  readonly normal: Vec3;
  readonly constant: number;
}

export const FRONTAL_PLANE: CutPlane = { normal: [0, 0, 1], constant: 0 };

const SNAP_MM = 1e-3;
const XYZ = 3;
const CORNERS = 3;

function signedDistances(positions: Float32Array, plane: CutPlane): Float32Array {
  const [nx, ny, nz] = plane.normal;
  const count = positions.length / XYZ;
  const distances = new Float32Array(count);
  for (let vertex = 0; vertex < count; vertex += 1) {
    const offset = vertex * XYZ;
    let distance =
      nx * positions[offset] +
      ny * positions[offset + 1] +
      nz * positions[offset + 2] +
      plane.constant;
    if (Math.abs(distance) < SNAP_MM) {
      positions[offset] -= nx * distance;
      positions[offset + 1] -= ny * distance;
      positions[offset + 2] -= nz * distance;
      distance = 0;
    }
    distances[vertex] = distance;
  }
  return distances;
}

class GrowingAttributes {
  readonly names: string[];
  readonly sizes: number[];
  readonly values: number[][];

  constructor(geometry: BufferGeometry) {
    this.names = Object.keys(geometry.attributes);
    this.sizes = this.names.map((name) => geometry.getAttribute(name).itemSize);
    this.values = this.names.map((name) => Array.from(geometry.getAttribute(name).array));
  }

  get count(): number {
    return this.values[0].length / this.sizes[0];
  }

  interpolate(from: number, to: number, share: number): number {
    const created = this.count;
    this.values.forEach((array, attribute) => {
      const size = this.sizes[attribute];
      for (let item = 0; item < size; item += 1) {
        const a = array[from * size + item];
        const b = array[to * size + item];
        array.push(a + (b - a) * share);
      }
    });
    return created;
  }

  build(index: number[]): BufferGeometry {
    const geometry = new BufferGeometry();
    this.names.forEach((name, attribute) => {
      const array = new Float32Array(this.values[attribute]);
      geometry.setAttribute(name, new BufferAttribute(array, this.sizes[attribute]));
    });
    geometry.setIndex(index);
    return geometry;
  }
}

function fan(polygon: readonly number[], into: number[]): void {
  for (let corner = 1; corner < polygon.length - 1; corner += 1) {
    into.push(polygon[0], polygon[corner], polygon[corner + 1]);
  }
}

export function insertPlane(geometry: BufferGeometry, plane: CutPlane): BufferGeometry {
  const positions = geometry.getAttribute('position').array as Float32Array;
  const distances = signedDistances(positions, plane);
  geometry.getAttribute('position').needsUpdate = true;
  return insertLevel(geometry, distances);
}

export type CrossingLocator = (from: number, to: number, share: number) => number;

export function insertLevel(
  geometry: BufferGeometry,
  distances: ArrayLike<number>,
  locate: CrossingLocator = (_from, _to, share) => share,
): BufferGeometry {
  const attributes = new GrowingAttributes(geometry);
  const index = geometry.getIndex()?.array ?? [];
  const crossings = new Map<number, number>();
  const vertexCount = distances.length;
  const crossing = (a: number, b: number): number => {
    const key = Math.min(a, b) * vertexCount + Math.max(a, b);
    const known = crossings.get(key);
    if (known !== undefined) return known;
    const created = attributes.interpolate(
      a,
      b,
      locate(a, b, distances[a] / (distances[a] - distances[b])),
    );
    crossings.set(key, created);
    return created;
  };
  const result: number[] = [];
  for (let t = 0; t < index.length; t += CORNERS) {
    const corners = [index[t], index[t + 1], index[t + 2]];
    const sides = corners.map((vertex) => Math.sign(distances[vertex]));
    if (!(sides.includes(1) && sides.includes(-1))) {
      result.push(...corners);
      continue;
    }
    const above: number[] = [];
    const below: number[] = [];
    corners.forEach((vertex, corner) => {
      const next = corners[(corner + 1) % CORNERS];
      if (sides[corner] >= 0) above.push(vertex);
      if (sides[corner] <= 0) below.push(vertex);
      if (sides[corner] * sides[(corner + 1) % CORNERS] < 0) {
        const created = crossing(vertex, next);
        above.push(created);
        below.push(created);
      }
    });
    fan(above, result);
    fan(below, result);
  }
  return attributes.build(result);
}

function triangleSide(
  positions: ArrayLike<number>,
  corners: readonly number[],
  plane: CutPlane,
): number {
  const [nx, ny, nz] = plane.normal;
  let sum = 0;
  for (const vertex of corners) {
    const offset = vertex * XYZ;
    sum += nx * positions[offset] + ny * positions[offset + 1] + nz * positions[offset + 2];
  }
  return sum / CORNERS + plane.constant;
}

export type TriangleFilter = (corners: readonly number[], triangle: number) => boolean;

export function sideFilter(
  geometry: BufferGeometry,
  plane: CutPlane,
  keepAbove: boolean,
): TriangleFilter {
  const positions = geometry.getAttribute('position').array;
  return (corners) => triangleSide(positions, corners, plane) > 0 === keepAbove;
}

function copyItems(source: ArrayLike<number>, size: number, used: readonly number[]): Float32Array {
  const target = new Float32Array(used.length * size);
  used.forEach((vertex, slot) => {
    for (let item = 0; item < size; item += 1)
      target[slot * size + item] = source[vertex * size + item];
  });
  return target;
}

export function subsetGeometry(geometry: BufferGeometry, keep: TriangleFilter): BufferGeometry {
  const index = geometry.getIndex()?.array ?? [];
  const remap = new Int32Array(geometry.getAttribute('position').count).fill(-1);
  const used: number[] = [];
  const kept: number[] = [];
  const corners = [0, 0, 0];
  for (let t = 0; t < index.length; t += CORNERS) {
    corners[0] = index[t];
    corners[1] = index[t + 1];
    corners[2] = index[t + 2];
    if (!keep(corners, t / CORNERS)) continue;
    for (const vertex of corners) {
      if (remap[vertex] < 0) {
        remap[vertex] = used.length;
        used.push(vertex);
      }
      kept.push(remap[vertex]);
    }
  }
  const subset = new BufferGeometry();
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    const { itemSize, array } = attribute;
    subset.setAttribute(name, new BufferAttribute(copyItems(array, itemSize, used), itemSize));
  }
  const morphs = geometry.morphAttributes as Record<
    string,
    BufferGeometry['morphAttributes']['position']
  >;
  for (const [name, targets] of Object.entries(morphs)) {
    if (!targets) continue;
    (subset.morphAttributes as typeof morphs)[name] = targets.map(
      ({ itemSize, array }) => new BufferAttribute(copyItems(array, itemSize, used), itemSize),
    );
  }
  subset.morphTargetsRelative = geometry.morphTargetsRelative;
  subset.setIndex(kept);
  return subset;
}

function onPlane(positions: ArrayLike<number>, vertex: number, plane: CutPlane): boolean {
  const [nx, ny, nz] = plane.normal;
  const offset = vertex * XYZ;
  const distance =
    nx * positions[offset] +
    ny * positions[offset + 1] +
    nz * positions[offset + 2] +
    plane.constant;
  return Math.abs(distance) < SNAP_MM * 2;
}

const KEY_SCALE = 1e3;

function positionKey(positions: ArrayLike<number>, vertex: number): string {
  const offset = vertex * XYZ;
  return `${Math.round(positions[offset] * KEY_SCALE)},${Math.round(positions[offset + 1] * KEY_SCALE)},${Math.round(positions[offset + 2] * KEY_SCALE)}`;
}

export function planeLoops(geometry: BufferGeometry, plane: CutPlane): number[][] {
  const positions = geometry.getAttribute('position').array;
  return openLoops(
    geometry,
    (a, b) => onPlane(positions, a, plane) && onPlane(positions, b, plane),
  );
}

export type EdgeFilter = (from: number, to: number) => boolean;

export function openLoops(geometry: BufferGeometry, accept: EdgeFilter = () => true): number[][] {
  const index = geometry.getIndex()?.array ?? [];
  const positions = geometry.getAttribute('position').array;
  const directed = new Map<string, [number, number]>();
  for (let t = 0; t < index.length; t += CORNERS) {
    for (let corner = 0; corner < CORNERS; corner += 1) {
      const a = index[t + corner];
      const b = index[t + ((corner + 1) % CORNERS)];
      if (!accept(a, b)) continue;
      const forward = `${positionKey(positions, a)}|${positionKey(positions, b)}`;
      const backward = `${positionKey(positions, b)}|${positionKey(positions, a)}`;
      if (directed.has(backward)) directed.delete(backward);
      else directed.set(forward, [a, b]);
    }
  }
  const next = new Map<string, number>();
  const vertexOf = new Map<string, number>();
  for (const [a, b] of directed.values()) {
    const key = positionKey(positions, a);
    next.set(key, b);
    vertexOf.set(key, a);
  }
  const loops: number[][] = [];
  const visited = new Set<string>();
  for (const start of next.keys()) {
    if (visited.has(start)) continue;
    const loop: number[] = [];
    let key: string | undefined = start;
    while (key !== undefined && !visited.has(key)) {
      visited.add(key);
      const vertex = vertexOf.get(key);
      if (vertex !== undefined) loop.push(vertex);
      const following = next.get(key);
      key = following === undefined ? undefined : positionKey(positions, following);
    }
    if (key === start && loop.length >= CORNERS) loops.push(loop);
  }
  return loops;
}
