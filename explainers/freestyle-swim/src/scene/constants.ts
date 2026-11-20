import { WATER_DEPTH_M } from '../model/layout';

export const SCENE_LIMITS = {
  fogNear: 4.5,
  fogFar: 11,
  cameraNear: 0.05,
  cameraFar: 60,
  maxPolarAngle: Math.PI * 0.9,
  cameraMinDistance: 0.6,
  cameraMaxDistance: 9,
} as const;

export const FLOOR_HEIGHT_M = -WATER_DEPTH_M;
