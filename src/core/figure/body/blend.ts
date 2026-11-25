import type { AddedVertices } from './partition';

const CORNERS = 3;

export function blendRows(
  data: Float32Array,
  itemSize: number,
  originalCount: number,
  added: AddedVertices,
): void {
  const { sources, weights } = added;
  for (let k = 0; k < added.count; k++) {
    const target = (originalCount + k) * itemSize;
    for (let c = 0; c < itemSize; c++) {
      let sum = 0;
      for (let i = 0; i < CORNERS; i++) {
        sum += weights[k * CORNERS + i] * data[sources[k * CORNERS + i] * itemSize + c];
      }
      data[target + c] = sum;
    }
  }
}

export function normaliseRows(data: Float32Array, from: number, to: number): void {
  for (let v = from; v < to; v++) {
    const at = v * CORNERS;
    const length = Math.hypot(data[at], data[at + 1], data[at + 2]) || 1;
    data[at] /= length;
    data[at + 1] /= length;
    data[at + 2] /= length;
  }
}

export function extend(
  source: Float32Array,
  itemSize: number,
  originalCount: number,
  added: AddedVertices,
): Float32Array {
  const data = new Float32Array((originalCount + added.count) * itemSize);
  data.set(source);
  blendRows(data, itemSize, originalCount, added);
  return data;
}
