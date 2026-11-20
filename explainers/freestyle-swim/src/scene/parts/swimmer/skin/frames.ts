import { Matrix4, Quaternion, Vector3 } from 'three';

const TWIST_EPSILON = 1e-9;
const column = new Vector3();
const basis = new Matrix4();
const across = new Vector3();
const unit = new Vector3();
const swingScratch = new Quaternion();
const twistScratch = new Quaternion();
const inverse = new Quaternion();

export function projectPerpendicular(vector: Vector3, axis: Vector3): Vector3 {
  return vector.addScaledVector(axis, -vector.dot(axis));
}

export function frameQuaternion(x: Vector3, y: Vector3, target: Quaternion): Quaternion {
  unit.copy(x).normalize();
  column.copy(y);
  projectPerpendicular(column, unit).normalize();
  across.crossVectors(unit, column);
  basis.makeBasis(unit, column, across);
  return target.setFromRotationMatrix(basis);
}

export function splitTwist(
  q: Quaternion,
  axis: Vector3,
  twist: Quaternion,
  swing: Quaternion,
): void {
  const along = q.x * axis.x + q.y * axis.y + q.z * axis.z;
  twist.set(axis.x * along, axis.y * along, axis.z * along, q.w);
  if (twist.lengthSq() < TWIST_EPSILON) twist.identity();
  else twist.normalize();
  swing.copy(q).multiply(inverse.copy(twist).invert());
}

export function partialTwist(
  q: Quaternion,
  axis: Vector3,
  share: number,
  swing: Quaternion,
  twist: Quaternion,
): void {
  splitTwist(q, axis, twistScratch, swingScratch);
  swing.copy(swingScratch);
  twist.identity().slerp(twistScratch, share);
}
