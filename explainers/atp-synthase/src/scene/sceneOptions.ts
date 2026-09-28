import type { SceneOptions } from '@core/scene/shell';

const CELL_BACKGROUND = '#0a0f1c';
const FOG = { color: CELL_BACKGROUND, near: 900, far: 3600 } as const;
const CAMERA = {
  near: 1,
  far: 8000,
  maxPolarAngle: Math.PI * 0.85,
  distance: { min: 30, max: 3200 },
} as const;
const CELL_DIM = { saturation: 0.35, brightness: 0.55, emissive: 0.3 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: CELL_BACKGROUND,
  fog: FOG,
  stage: false,
  camera: CAMERA,
  highlight: { dim: CELL_DIM },
};
