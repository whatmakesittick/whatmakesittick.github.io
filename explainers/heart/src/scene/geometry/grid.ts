import type { GridCube } from './polygonise';

export interface Bounds {
  readonly min: [number, number, number];
  readonly max: [number, number, number];
}

export function cubeAround(bounds: Bounds, marginMm: number, resolution: number): GridCube {
  const centre: [number, number, number] = [0, 1, 2].map(
    (axis) => (bounds.min[axis] + bounds.max[axis]) / 2,
  ) as [number, number, number];
  const half = Math.max(...[0, 1, 2].map((axis) => (bounds.max[axis] - bounds.min[axis]) / 2));
  const cell = (2 * (half + marginMm)) / resolution;
  return { centre, halfSize: half + marginMm + 2 * cell, resolution };
}
