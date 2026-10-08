import { THEME } from '../theme';

type Triple = readonly [number, number, number];

export const HAZE = {
  colour: THEME.haze,
  near: 9000,
  far: 28_000,
  nearPerDistance: 1.3,
  farPerDistance: 3,
  maxNearShare: 0.8,
} as const;

export const SKY = { top: THEME.skyTop, horizon: THEME.haze } as const;

export const HIGHLIGHT_DIM = { saturation: 0.5, brightness: 0.6, emissive: 0.35 } as const;

export const SCENE_LIMITS = {
  cameraNear: 2,
  cameraFar: 30_000,
  maxPolarAngle: Math.PI * 0.47,
  cameraMinDistance: 6,
  cameraMaxDistance: 25_000,
} as const;

export const LIGHT_RIG = {
  distance: 400,
  key: { color: '#fff1dc', intensity: 2.6, direction: [-0.58, 0.57, 0.58] as Triple },
  fill: { color: '#b9d2f0', intensity: 0.7, direction: [0.5, 0.75, -0.45] as Triple },
  rim: { color: '#ffe2bd', intensity: 1.1, direction: [0.8, 0.35, 0.5] as Triple },
} as const;

export const SUN_DIRECTION: Triple = LIGHT_RIG.key.direction;

export const EASE_SECONDS = 1.5;

export const SUBSTATION_HEIGHT_M = 12;

export const GROUND_LIFT_M = 2;
