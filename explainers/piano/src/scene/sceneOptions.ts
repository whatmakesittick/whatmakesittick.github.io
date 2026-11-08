import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { SceneOptions } from '@core/scene/shell';
import { THEME } from '../theme';
import { keepsCutHit } from './parts/cut';

const FOG = { near: 7, far: 15 } as const;
const CAMERA = {
  near: 0.005,
  far: 40,
  minDistance: 0.06,
  maxDistance: 9,
  floorMargin: 0.02,
  maxPolarAngle: Math.PI * 0.56,
} as const;
const HIGHLIGHT_DIM = { saturation: 0.35, brightness: 0.55, emissive: 0.25 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.background,
  fog: { color: THEME.background, ...FOG },
  stage: false,
  camera: {
    near: CAMERA.near,
    far: CAMERA.far,
    floorMargin: CAMERA.floorMargin,
    maxPolarAngle: CAMERA.maxPolarAngle,
    distance: { min: CAMERA.minDistance, max: CAMERA.maxDistance },
  },
  highlight: { dim: HIGHLIGHT_DIM, undimmed: [UNDIMMED_GROUP] },
  occlusionHitFilter: keepsCutHit,
};
