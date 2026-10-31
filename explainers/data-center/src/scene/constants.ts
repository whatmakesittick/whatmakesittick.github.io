import { GEN_START_S } from '../model';
import { THEME } from '../theme';

type Triple = readonly [number, number, number];

export const HAZE = { color: THEME.fog, near: 250, far: 900 } as const;

export const HIGHLIGHT_DIM = { saturation: 0.4, brightness: 0.7, emissive: 0.3 } as const;

export const SCENE_LIMITS = {
  cameraNear: 0.05,
  cameraFar: 1200,
  maxPolarAngle: Math.PI * 0.495,
  cameraMinDistance: 0.6,
  cameraMaxDistance: 320,
} as const;

export const LIGHT_RIG = {
  distance: 300,
  key: { color: THEME.keyLight, intensity: 1.9, direction: [-0.55, 0.62, 0.56] as Triple },
  fill: { color: THEME.fillLight, intensity: 0.85, direction: [0.55, 0.7, -0.5] as Triple },
  rim: { color: '#eef2f7', intensity: 0.9, direction: [0.35, 0.42, -0.84] as Triple },
} as const;

export const OUTAGE_DRILL = {
  seconds: 24,
  crankSeconds: GEN_START_S,
  gridReturnSeconds: 20,
  rampSeconds: 1.5,
} as const;
