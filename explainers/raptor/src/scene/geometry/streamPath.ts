import type { Point } from '../../model';
import { curveThrough } from './tube';

const XYZ = 3;

export interface SampledPath {
  readonly points: Float32Array;
  readonly count: number;
  readonly length: number;
}

export function samplePath(points: readonly Point[], samples: number): SampledPath {
  const curve = curveThrough(points);
  const spaced = curve.getSpacedPoints(samples);
  const flat = new Float32Array(spaced.length * XYZ);
  spaced.forEach((point, index) => flat.set([point.x, point.y, point.z], index * XYZ));
  return { points: flat, count: spaced.length, length: curve.getLength() };
}

export function pointAlong(path: SampledPath, share: number, target: number[]): number[] {
  const wrapped = share - Math.floor(share);
  const position = wrapped * (path.count - 1);
  const index = Math.min(path.count - 2, Math.floor(position));
  const blend = position - index;
  for (let axis = 0; axis < XYZ; axis += 1) {
    const from = path.points[index * XYZ + axis];
    const to = path.points[(index + 1) * XYZ + axis];
    target[axis] = from + (to - from) * blend;
  }
  return target;
}

export function shareCounts(lengths: readonly number[], total: number): number[] {
  const sum = lengths.reduce((acc, length) => acc + length, 0);
  const counts = lengths.map((length) => Math.max(1, Math.floor((total * length) / sum)));
  counts[0] += total - counts.reduce((acc, count) => acc + count, 0);
  return counts;
}
