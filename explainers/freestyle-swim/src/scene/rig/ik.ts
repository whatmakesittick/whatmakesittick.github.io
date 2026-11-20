import { Vector3 } from 'three';

const MIN_REACH = 1e-4;
const along = new Vector3();
const side = new Vector3();

export function lawOfCosines(upper: number, lower: number, angleRad: number): number {
  return Math.sqrt(upper * upper + lower * lower - 2 * upper * lower * Math.cos(angleRad));
}

export function solveTwoBone(
  root: Vector3,
  tip: Vector3,
  upper: number,
  lower: number,
  pole: Vector3,
  joint: Vector3,
): Vector3 {
  along.subVectors(tip, root);
  const reach = Math.min(
    Math.max(along.length(), Math.abs(upper - lower) + MIN_REACH),
    upper + lower - MIN_REACH,
  );
  along.normalize();
  const offset = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  const height = Math.sqrt(Math.max(upper * upper - offset * offset, 0));
  side.copy(pole).addScaledVector(along, -pole.dot(along));
  if (side.lengthSq() < MIN_REACH) side.set(0, 1, 0).addScaledVector(along, -along.y);
  side.normalize();
  return joint.copy(root).addScaledVector(along, offset).addScaledVector(side, height);
}
