import type { SceneOptions } from '@core/scene/shell';

const BACKGROUND = '#16181c';
const CAMERA = {
  near: 0.5,
  far: 4000,
  maxPolarAngle: Math.PI * 0.5,
  distance: { min: 3, max: 1200 },
} as const;
const GENTLE_DIM = { saturation: 0.45, brightness: 0.62, emissive: 0.35 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: BACKGROUND,
  stage: true,
  camera: CAMERA,
  highlight: { dim: GENTLE_DIM },
};
