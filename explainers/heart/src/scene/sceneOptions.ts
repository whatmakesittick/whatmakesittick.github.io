import type { SceneOptions } from '@core/scene/shell';

const CAMERA = {
  near: 1,
  far: 2500,
  maxPolarAngle: Math.PI * 0.58,
  distance: { min: 25, max: 900 },
} as const;
const GHOST_DIM = { saturation: 0.4, brightness: 0.55, emissive: 0.3, opacity: 1 } as const;
const UNDIMMED_BLOOD = ['venousBlood', 'arterialBlood'] as const;

export const SCENE_OPTIONS: SceneOptions = {
  stage: true,
  camera: CAMERA,
  highlight: { dim: GHOST_DIM, undimmed: UNDIMMED_BLOOD },
};
