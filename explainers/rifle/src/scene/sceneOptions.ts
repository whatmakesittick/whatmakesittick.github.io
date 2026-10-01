import type { SceneOptions } from '@core/scene/shell';

const CAMERA = {
  near: 2,
  far: 12000,
  distance: { min: 60, max: 4000 },
} as const;
const DIM = { saturation: 0.3, brightness: 0.5, emissive: 0.3, opacity: 0.4 } as const;
const UNDIMMED = ['hotGas'] as const;

export const SCENE_OPTIONS: SceneOptions = {
  stage: false,
  camera: CAMERA,
  highlight: { dim: DIM, undimmed: UNDIMMED },
};
