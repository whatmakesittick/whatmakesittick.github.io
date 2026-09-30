import type { SceneOptions } from '@core/scene/shell';

const CAMERA = {
  near: 0.1,
  far: 4000,
  maxPolarAngle: Math.PI,
  distance: { min: 3.5, max: 90 },
} as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: '#02030a',
  stage: false,
  camera: CAMERA,
};
