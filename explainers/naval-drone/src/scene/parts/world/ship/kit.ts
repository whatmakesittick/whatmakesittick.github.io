import {
  BoxGeometry,
  BufferAttribute,
  Color,
  CylinderGeometry,
  LatheGeometry,
  Quaternion,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import type { Vec3 } from '../../../geometry/surface';

export type Plan = readonly (readonly [number, number])[];

export const SEGMENTS = { square: 4, small: 8, medium: 12, large: 16 } as const;

const RGB = 3;
const UP = new Vector3(0, 1, 0);

export function box(size: Vec3, centre: Vec3, yaw = 0): BufferGeometry {
  return new BoxGeometry(...size).rotateY(yaw).translate(...centre);
}

export function rod(
  from: Vec3,
  to: Vec3,
  radius: number,
  segments: number = SEGMENTS.small,
  radiusTo = radius,
) {
  const start = new Vector3(...from);
  const axis = new Vector3(...to).sub(start);
  const middle = start.addScaledVector(axis, 1 / 2);
  return new CylinderGeometry(radiusTo, radius, axis.length(), segments)
    .applyQuaternion(new Quaternion().setFromUnitVectors(UP, axis.normalize()))
    .translate(middle.x, middle.y, middle.z);
}

export function lathe(profile: Plan, segments: number, base: Vec3): BufferGeometry {
  const points = profile.map(([radius, height]) => new Vector2(radius, height));
  return new LatheGeometry(points, segments).translate(...base);
}

export function painted(geometry: BufferGeometry, colour: string): BufferGeometry {
  const tint = new Color(colour);
  const count = geometry.getAttribute('position').count;
  const values = new Float32Array(count * RGB);
  for (let at = 0; at < count; at += 1) tint.toArray(values, at * RGB);
  return geometry.setAttribute('color', new BufferAttribute(values, RGB));
}

export function mirrored<T extends readonly number[]>(spots: readonly T[], axis: number): T[] {
  return spots.flatMap((spot) =>
    spot[axis]
      ? [spot, spot.map((value, at) => (at === axis ? -value : value)) as unknown as T]
      : [spot],
  );
}
