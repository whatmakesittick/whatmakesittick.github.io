export const SCENE_LIMITS = {
  fogNear: 60,
  fogFar: 1400,
  cameraNear: 0.05,
  cameraFar: 4000,
  maxPolarAngle: Math.PI / 2 - 0.04,
  cameraMinDistance: 0.5,
  cameraMaxDistance: 14,
} as const;

export const LAYER = {
  ground: 0,
  groundShadow: 2,
  runnerShadow: 3,
  overlay: 10,
  sky: 100,
} as const;

import { SUN_DIR, WALL } from '../model/layout';

export const SEA_LEVEL_M = -1.6;
export const BEACH_TOP_M = -1;
export const KERB = { widthM: 0.15, heightM: 0.12 } as const;
export const FOOTWAY_Z_M = -1.95;
export const LAMP_Z_M = 6.1;
export const DELINEATOR_Z_M = -2.03;
export const GROUND_EXTENT_M = 3000;
export const SKY_RADIUS_M = 2500;
export const PARAPET = { heightM: 0.26, faceZM: WALL.zM + WALL.thicknessM / 2 } as const;
export const RAIL = {
  topM: WALL.heightM,
  middleM: 0.56,
  tubeRadiusM: 0.022,
  postRadiusM: 0.02,
  postSpacingM: 2.4,
} as const;

export function shadowReachZ(heightM: number): number {
  return (heightM * Math.abs(SUN_DIR[2])) / SUN_DIR[1];
}
