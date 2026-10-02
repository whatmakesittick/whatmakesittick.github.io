import { CylinderGeometry, LatheGeometry, Quaternion, Vector2, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import type { Vec3 } from './airfoilSurface';

const Y_AXIS = new Vector3(0, 1, 0);
const QUARTER_TURN = Math.PI / 2;
const HUB_WIDTH_SHARE = 0.9;

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

export interface TyreShape {
  radius: number;
  width: number;
  hubShare: number;
  segments: number;
}

const TYRE_PROFILE = [
  [0.62, -0.5],
  [0.9, -0.5],
  [0.98, -0.36],
  [1, -0.15],
  [1, 0.15],
  [0.98, 0.36],
  [0.9, 0.5],
  [0.62, 0.5],
] as const;

export function tyreGeometry({ radius, width, segments }: TyreShape): BufferGeometry {
  const profile = TYRE_PROFILE.map(([r, y]) => new Vector2(r * radius, y * width));
  const geometry = new LatheGeometry(profile, segments);
  geometry.rotateX(QUARTER_TURN);
  return geometry;
}

export function hubGeometry({ radius, width, hubShare, segments }: TyreShape): BufferGeometry {
  const geometry = new CylinderGeometry(
    radius * hubShare,
    radius * hubShare,
    width * HUB_WIDTH_SHARE,
    segments,
  );
  geometry.rotateX(QUARTER_TURN);
  return geometry;
}
