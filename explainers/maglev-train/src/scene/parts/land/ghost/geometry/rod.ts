import { CylinderGeometry, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Vector3Tuple } from 'three';

const UP = new Vector3(0, 1, 0);

export interface Rod {
  readonly from: Vector3Tuple;
  readonly to: Vector3Tuple;
  readonly radius: number;
  readonly sides: number;
}

export function alongSegment<G extends BufferGeometry>(
  geometry: G,
  from: Vector3Tuple,
  to: Vector3Tuple,
): G {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start).normalize();
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction));
  geometry.translate(start.x, start.y, start.z);
  return geometry;
}

export function segmentLength(from: Vector3Tuple, to: Vector3Tuple): number {
  return new Vector3(...from).distanceTo(new Vector3(...to));
}

export function rod({ from, to, radius, sides }: Rod): BufferGeometry {
  const length = segmentLength(from, to);
  const geometry = new CylinderGeometry(radius, radius, length, sides, 1, true);
  geometry.translate(0, length / 2, 0);
  return alongSegment(geometry, from, to);
}
