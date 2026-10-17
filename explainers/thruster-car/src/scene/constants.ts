import type { PartId } from '../ids';
import { SITE } from '../model/layout';
import { THEME } from '../theme';

type Triple = readonly [number, number, number];

export const SCENE_LIMITS = {
  fogNear: SITE.fogNear,
  fogFar: 450,
  cameraNear: 0.1,
  cameraFar: 800,
  cameraMinDistance: 1.2,
  cameraMaxDistance: 260,
  maxPolarAngle: Math.PI * 0.54,
  targetFloorMargin: 0.2,
} as const;

export const DUSK_DIM = { saturation: 0.3, brightness: 0.8 } as const;

export const UNDIMMED_PARTS: readonly PartId[] = ['runway', 'landingPad'];

export const LIGHT_RIG = {
  distance: 400,
  key: { color: THEME.keyLight, intensity: 2.8, direction: [-1, 0.5, 0.6] as Triple },
  fill: { color: THEME.fillLight, intensity: 0.6, direction: [0.4, 1, 0.5] as Triple },
  rim: { color: '#c6cfff', intensity: 1.3, direction: [1, 0.3, -1] as Triple },
} as const;
