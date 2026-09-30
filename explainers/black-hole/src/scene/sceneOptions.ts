import type { SceneOptions } from '@core/scene/shell';

const CAMERA = {
  near: 0.05,
  far: 4000,
  maxPolarAngle: Math.PI,
  distance: { min: 0.8, max: 90 },
} as const;
const DIM = { saturation: 0.35, brightness: 0.55, emissive: 0.3 } as const;
const UNDIMMED = ['beacon'] as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: '#02030a',
  stage: false,
  camera: CAMERA,
  highlight: { dim: DIM, undimmed: UNDIMMED },
};
