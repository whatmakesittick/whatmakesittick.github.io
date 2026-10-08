import { CylinderGeometry, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

const UP = new Vector3(0, 1, 0);

export function cylinderBetween(
  from: Vector3,
  to: Vector3,
  radius: number,
  segments: number,
): BufferGeometry {
  const direction = to.clone().sub(from);
  const geometry = new CylinderGeometry(radius, radius, direction.length(), segments);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction.normalize()));
  const middle = from.clone().add(to).multiplyScalar(0.5);
  geometry.translate(middle.x, middle.y, middle.z);
  return geometry;
}
