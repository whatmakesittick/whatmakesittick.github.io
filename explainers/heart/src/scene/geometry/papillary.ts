import { LatheGeometry, Quaternion, Vector2, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import type { Field, Vec3 } from './field';

const MAX_REACH_MM = 60;

export function wallBase(
  cavity: Field,
  tip: Vec3,
  toward: Vec3,
  depthMm: number,
  stepMm: number,
): Vector3 {
  const direction = new Vector3(...toward).normalize();
  const point = new Vector3(...tip);
  for (let travelled = 0; travelled < MAX_REACH_MM; travelled += stepMm) {
    if (cavity.distance(point.x, point.y, point.z) > depthMm) return point;
    point.addScaledVector(direction, stepMm);
  }
  return point;
}

export interface FingerShape {
  readonly baseRadius: number;
  readonly tipRadius: number;
  readonly segments: number;
}

const FINGER_PROFILE: readonly (readonly [share: number, height: number])[] = [
  [1, 0],
  [0.96, 0.3],
  [0.82, 0.62],
  [0.62, 0.82],
  [0.45, 0.9],
  [0.25, 0.96],
  [0, 1],
];
const Y_AXIS = new Vector3(0, 1, 0);

export function papillaryFinger(base: Vector3, tip: Vector3, shape: FingerShape): BufferGeometry {
  const length = base.distanceTo(tip);
  const points = FINGER_PROFILE.map(([share, height]) => {
    const radius = shape.tipRadius + (shape.baseRadius - shape.tipRadius) * share;
    const rounded = height < 1 ? radius : 0;
    return new Vector2(rounded, height * length);
  });
  const finger = new LatheGeometry(points, shape.segments);
  finger.deleteAttribute('uv');
  finger.applyQuaternion(
    new Quaternion().setFromUnitVectors(Y_AXIS, tip.clone().sub(base).normalize()),
  );
  finger.translate(base.x, base.y, base.z);
  return finger;
}
