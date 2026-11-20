export type Vec = [number, number, number];

export const sub = (a: ArrayLike<number>, b: ArrayLike<number>): Vec => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
export const add = (a: ArrayLike<number>, b: ArrayLike<number>): Vec => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export const scale = (a: ArrayLike<number>, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const length = (a: ArrayLike<number>): number => Math.hypot(a[0], a[1], a[2]);
export const mix = (a: ArrayLike<number>, b: ArrayLike<number>, t: number): Vec =>
  add(scale(a, 1 - t), scale(b, t));

export function cross(a: ArrayLike<number>, b: ArrayLike<number>): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function normalize(a: ArrayLike<number>): Vec {
  const size = length(a) || 1;
  return scale(a, 1 / size);
}

export function perpendicular(a: ArrayLike<number>, axis: ArrayLike<number>): Vec {
  const unit = normalize(axis);
  return sub(a, scale(unit, dot(a, unit)));
}

export function point(positions: ArrayLike<number>, index: number): Vec {
  return [positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]];
}

export function centroid(positions: ArrayLike<number>, indices: Iterable<number>): Vec {
  const sum: Vec = [0, 0, 0];
  let count = 0;
  for (const index of indices) {
    sum[0] += positions[index * 3];
    sum[1] += positions[index * 3 + 1];
    sum[2] += positions[index * 3 + 2];
    count++;
  }
  return scale(sum, 1 / Math.max(count, 1));
}

export const mirrorZ = (a: ArrayLike<number>): Vec => [a[0], a[1], -a[2]];
