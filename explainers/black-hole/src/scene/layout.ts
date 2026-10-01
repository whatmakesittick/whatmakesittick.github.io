import { Vector3 } from 'three';
import type { RegionSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { RELEASE_RADIUS, RS_LIGHT_SECONDS, SHIP_RADIUS } from '../model';

const FULL_TURN = Math.PI * 2;
const DEGREES_TO_RADIANS = Math.PI / 180;

export const FALL_ANGLE_DEG = 60;
export const FALL_ANGLE = FALL_ANGLE_DEG * DEGREES_TO_RADIANS;
export const FALL_DIRECTION = new Vector3(Math.cos(FALL_ANGLE), Math.sin(FALL_ANGLE), 0);

export const ORBIT_PERIOD_S = FULL_TURN * RS_LIGHT_SECONDS * Math.sqrt(2 * SHIP_RADIUS ** 3);
export const SHIP_ORBIT = {
  radius: SHIP_RADIUS,
  angularSpeed: FULL_TURN / ORBIT_PERIOD_S,
} as const;
const SHIP_TIME_STRETCH = 1.2;

export const PROBE_SIZE = 0.35;
export const SHIP_SIZE = 1.8;
export const FLASH_SPEED = 1;

export const SHEET = { rim: 20, depthScale: 1, segments: 96, rings: 48 } as const;

export function probePosition(radius: number, target = new Vector3()): Vector3 {
  return target.copy(FALL_DIRECTION).multiplyScalar(radius);
}

export function shipAngle(tau: number): number {
  return FALL_ANGLE + SHIP_ORBIT.angularSpeed * tau * SHIP_TIME_STRETCH;
}

export function shipPosition(tau: number, target = new Vector3()): Vector3 {
  const angle = shipAngle(tau);
  return target.set(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(SHIP_ORBIT.radius);
}

export function sheetDepth(radius: number): number {
  const dip = (r: number) => 2 * Math.sqrt(Math.max(r - 1, 0));
  return SHEET.depthScale * (dip(SHEET.rim) - dip(radius));
}

const SCENE_EXTENT = 22;
const HOLE_EXTENT = 13;
const SYSTEM_EXTENT = 12;
const SHEET_EXTENT = SHEET.rim;

export const REGIONS: Readonly<Record<Exclude<RegionId, 'probeClose'>, RegionSpec>> = {
  scene: {
    x: [-SCENE_EXTENT, SCENE_EXTENT],
    y: [-SCENE_EXTENT, SCENE_EXTENT],
    z: [-SCENE_EXTENT, SCENE_EXTENT],
  },
  system: { x: [-SYSTEM_EXTENT, SYSTEM_EXTENT], y: [-5, 18.5], z: [-1, 1] },
  hole: { x: [-HOLE_EXTENT, HOLE_EXTENT], y: [-3, 3], z: [-HOLE_EXTENT, HOLE_EXTENT] },
  sheet: { x: [-SHEET_EXTENT, SHEET_EXTENT], y: [-9, 1], z: [-SHEET_EXTENT, SHEET_EXTENT] },
};

export const PROBE_CLOSE_HALF_SIZE = 1.5;

export { RELEASE_RADIUS };
