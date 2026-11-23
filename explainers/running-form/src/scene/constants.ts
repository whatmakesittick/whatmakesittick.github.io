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

export const SEA_LEVEL_M = -1.6;
export const BEACH_TOP_M = -1;
export const KERB = { widthM: 0.15, heightM: 0.12 } as const;
export const FOOTWAY_Z_M = -1.95;
export const LAMP_Z_M = 6.1;
export const DELINEATOR_Z_M = -2.03;
export const GROUND_EXTENT_M = 3000;
export const SKY_RADIUS_M = 2500;
