import { Vector3 } from 'three';
import type { Figure } from '@core/figure';

const AXES = 3;
const PARALLEL = 1e-9;

const edgeA = new Vector3();
const edgeB = new Vector3();
const cross = new Vector3();
const offset = new Vector3();
const corner = new Vector3();
const first = new Vector3();

function cornerAt(figure: Figure, index: number, out: Vector3): Vector3 {
  return out.fromArray(figure.restPositions, figure.indices[index] * AXES);
}

function hitDistance(
  figure: Figure,
  triangle: number,
  origin: Vector3,
  direction: Vector3,
): number {
  first.copy(cornerAt(figure, triangle * AXES, corner));
  edgeA.copy(cornerAt(figure, triangle * AXES + 1, corner)).sub(first);
  edgeB.copy(cornerAt(figure, triangle * AXES + 2, corner)).sub(first);
  cross.crossVectors(direction, edgeB);
  const determinant = edgeA.dot(cross);
  if (Math.abs(determinant) < PARALLEL) return NaN;
  offset.copy(origin).sub(first);
  const u = offset.dot(cross) / determinant;
  if (u < 0 || u > 1) return NaN;
  const v = direction.dot(cross.crossVectors(offset, edgeA)) / determinant;
  if (v < 0 || u + v > 1) return NaN;
  return edgeB.dot(cross) / determinant;
}

export function outermostHit(
  figure: Figure,
  origin: Vector3,
  direction: Vector3,
): Vector3 | undefined {
  let farthest = 0;
  for (let triangle = 0; triangle < figure.triangleCount; triangle++) {
    const distance = hitDistance(figure, triangle, origin, direction);
    if (distance > farthest) farthest = distance;
  }
  return farthest > 0 ? origin.clone().addScaledVector(direction, farthest) : undefined;
}
