import type { PartId } from '../ids';
type Triple = readonly [number, number, number];

export const SCENE_LIMITS = {
  fogNear: 220,
  fogFar: 1100,
  cameraNear: 0.1,
  cameraFar: 1300,
  cameraMinDistance: 1.2,
  cameraMaxDistance: 700,
  maxPolarAngle: Math.PI * 0.54,
  targetFloorMargin: 0.2,
} as const;

export const DUSK_DIM = { saturation: 0.3, brightness: 0.8 } as const;

export const UNDIMMED_PARTS: readonly PartId[] = ['runway', 'landingPad'];

export const LIGHT_RIG = {
  distance: 400,
  key: { color: '#ff9c5c', intensity: 4, direction: [-1, 0.5, 0.6] as Triple },
  fill: { color: '#8d8cff', intensity: 0.95, direction: [0.5, 1, -0.5] as Triple },
  rim: { color: '#d2dbff', intensity: 1.8, direction: [1, 0.3, -1] as Triple },
} as const;
