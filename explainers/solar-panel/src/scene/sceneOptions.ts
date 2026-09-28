import type { SceneOptions } from '@core/scene/shell';
import { SUNRISE_MIN } from '../model';
import { skyPalette } from './parts/sky/palette';

const CAMERA = {
  near: 1,
  far: 9000,
  maxPolarAngle: Math.PI * 0.52,
  distance: { min: 20, max: 4000 },
} as const;
const GHOST_DIM = { saturation: 0.45, brightness: 0.62, emissive: 0.35, opacity: 0.4 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: `#${skyPalette(SUNRISE_MIN).horizon.getHexString()}`,
  stage: false,
  camera: CAMERA,
  highlight: { dim: GHOST_DIM },
};
