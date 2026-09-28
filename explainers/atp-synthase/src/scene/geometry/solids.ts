import {
  CapsuleGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import { sampleProfile } from '@core/scene/geometry/lathe';
import { azimuthPoint } from '../../model/scale';
import type { Detail, ProfilePoint } from '../constants';

const UP = new Vector3(0, 1, 0);
const UNIT_SCALE = new Vector3(1, 1, 1);
const HALF = 0.5;

export function polar(azimuthDeg: number, radius: number, y: number): Vector3 {
  const point = azimuthPoint(azimuthDeg, radius, y);
  return new Vector3(point.x, point.y, point.z);
}

export function capsuleBetween(
  from: Vector3,
  to: Vector3,
  radius: number,
  detail: Detail,
): BufferGeometry {
  const direction = new Vector3().subVectors(to, from);
  const geometry = new CapsuleGeometry(radius, direction.length(), detail.cap, detail.radial);
  const turn = new Quaternion().setFromUnitVectors(UP, direction.normalize());
  const middle = new Vector3().addVectors(from, to).multiplyScalar(HALF);
  return geometry.applyMatrix4(new Matrix4().compose(middle, turn, UNIT_SCALE));
}

export function sphereAt(centre: Vector3, radius: number, detail: Detail): BufferGeometry {
  const geometry = new SphereGeometry(radius, detail.sphere, Math.ceil(detail.sphere * HALF));
  return geometry.translate(centre.x, centre.y, centre.z);
}

export function latheY(
  profile: readonly ProfilePoint[],
  height: number,
  radius: number,
  detail: Detail,
): BufferGeometry {
  const points = profile.map(([heightShare, radiusShare]): readonly [number, number] => [
    heightShare * height,
    radiusShare * radius,
  ]);
  return new LatheGeometry(sampleProfile(points, detail.profile), detail.lathe);
}
