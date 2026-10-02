import { CylinderGeometry, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

export type Vec3 = readonly [x: number, y: number, z: number];

const Y_AXIS = new Vector3(0, 1, 0);

export function rod(
  from: Vec3,
  to: Vec3,
  radius: number,
  segments: number,
  endRadius = radius,
): BufferGeometry {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const length = direction.length();
  const geometry = new CylinderGeometry(endRadius, radius, length, segments);
  geometry.translate(0, length / 2, 0);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(Y_AXIS, direction.normalize()));
  geometry.translate(start.x, start.y, start.z);
  return geometry;
}

export function along(from: Vec3, direction: Vec3, length: number): Vec3 {
  const scale = length / Math.hypot(...direction);
  return [
    from[0] + direction[0] * scale,
    from[1] + direction[1] * scale,
    from[2] + direction[2] * scale,
  ];
}
