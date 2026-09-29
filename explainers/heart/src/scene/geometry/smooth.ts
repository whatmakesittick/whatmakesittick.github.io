import type { BufferGeometry } from 'three';
import type { Field } from './field';
import { gradient } from './field';

export interface TaubinOptions {
  readonly iterations: number;
  readonly shrink: number;
  readonly inflate: number;
}

export const TAUBIN: TaubinOptions = { iterations: 12, shrink: 0.5, inflate: -0.53 };

const XYZ = 3;
const CORNERS = 3;

export interface Neighbours {
  readonly offsets: Int32Array;
  readonly list: Int32Array;
}

export function neighboursOf(index: ArrayLike<number>, vertexCount: number): Neighbours {
  const degree = new Int32Array(vertexCount + 1);
  for (let t = 0; t < index.length; t += 1) degree[index[t] + 1] += 2;
  const offsets = new Int32Array(vertexCount + 1);
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    offsets[vertex + 1] = offsets[vertex] + degree[vertex + 1];
  }
  const raw = new Int32Array(offsets[vertexCount]);
  const fill = offsets.slice(0, vertexCount);
  for (let t = 0; t < index.length; t += CORNERS) {
    for (let corner = 0; corner < CORNERS; corner += 1) {
      const own = index[t + corner];
      raw[fill[own]++] = index[t + ((corner + 1) % CORNERS)];
      raw[fill[own]++] = index[t + ((corner + 2) % CORNERS)];
    }
  }
  const unique = new Int32Array(vertexCount + 1);
  const list: number[] = [];
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const seen = new Set<number>();
    for (let slot = offsets[vertex]; slot < offsets[vertex + 1]; slot += 1) seen.add(raw[slot]);
    seen.forEach((neighbour) => list.push(neighbour));
    unique[vertex + 1] = list.length;
  }
  return { offsets: unique, list: Int32Array.from(list) };
}

function relax(
  positions: Float32Array,
  neighbours: Neighbours,
  weight: number,
  pinned: Uint8Array | undefined,
): void {
  const source = positions.slice();
  const { offsets, list } = neighbours;
  const count = offsets.length - 1;
  for (let vertex = 0; vertex < count; vertex += 1) {
    const start = offsets[vertex];
    const end = offsets[vertex + 1];
    if (end === start || pinned?.[vertex]) continue;
    for (let axis = 0; axis < XYZ; axis += 1) {
      let sum = 0;
      for (let n = start; n < end; n += 1) sum += source[list[n] * XYZ + axis];
      const own = source[vertex * XYZ + axis];
      positions[vertex * XYZ + axis] = own + weight * (sum / (end - start) - own);
    }
  }
}

export function taubinSmooth(
  geometry: BufferGeometry,
  options: TaubinOptions = TAUBIN,
  pinned?: Uint8Array,
): void {
  const attribute = geometry.getAttribute('position');
  const positions = attribute.array as Float32Array;
  const neighbours = neighboursOf(geometry.getIndex()?.array ?? [], attribute.count);
  for (let iteration = 0; iteration < options.iterations; iteration += 1) {
    relax(positions, neighbours, options.shrink, pinned);
    relax(positions, neighbours, options.inflate, pinned);
  }
  attribute.needsUpdate = true;
}

export function snapToField(geometry: BufferGeometry, field: Field): void {
  const attribute = geometry.getAttribute('position');
  const positions = attribute.array as Float32Array;
  for (let vertex = 0; vertex < attribute.count; vertex += 1) {
    const offset = vertex * XYZ;
    const x = positions[offset];
    const y = positions[offset + 1];
    const z = positions[offset + 2];
    const distance = field.distance(x, y, z);
    const [gx, gy, gz] = gradient(field, x, y, z);
    positions[offset] = x - gx * distance;
    positions[offset + 1] = y - gy * distance;
    positions[offset + 2] = z - gz * distance;
  }
  attribute.needsUpdate = true;
}
