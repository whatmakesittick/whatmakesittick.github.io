import { THEME } from '../theme';

type Triple = readonly [number, number, number];

export const HAZE = { colour: THEME.fog, near: 520, far: 1000 } as const;

export const SKY = { top: '#8fb0cc', horizon: THEME.sky, sun: THEME.keyLight } as const;

export const LINE_DRAW = { behind: 1300, ahead: 1300 } as const;

export const HIGHLIGHT_DIM = { saturation: 0.4, brightness: 0.55, emissive: 0.3 } as const;

export const SCENE_LIMITS = {
  cameraNear: 0.05,
  cameraFar: 4000,
  maxPolarAngle: Math.PI * 0.62,
  cameraMinDistance: 1.5,
  cameraMaxDistance: 250,
} as const;

export const LIGHT_RIG = {
  distance: 300,
  key: { color: THEME.keyLight, intensity: 2.5, direction: [0.62, 0.32, -0.72] as Triple },
  fill: { color: THEME.fillLight, intensity: 0.75, direction: [-0.45, 0.8, 0.4] as Triple },
  rim: { color: '#fff4e6', intensity: 1.0, direction: [-0.75, 0.3, 0.6] as Triple },
} as const;

export const SUN_DIRECTION: Triple = LIGHT_RIG.key.direction;

export const EASE_SECONDS = 0.6;

export const NUDGE = {
  settleSeconds: 1.8,
  frequencyHz: 2.4,
  decaySeconds: 0.45,
  bumpGapMm: 1.6,
  gustLateralMm: 2,
} as const;
