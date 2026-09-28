import type { SceneOptions } from '@core/scene/shell';
import { SKY } from './constants';

const CAMERA = { near: 1, far: 4000, maxPolarAngle: Math.PI * 0.56 } as const;
const GENTLE_DIM = { saturation: 0.45, brightness: 0.62, emissive: 0.35 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: SKY.horizon,
  stage: false,
  camera: CAMERA,
  highlight: { dim: GENTLE_DIM },
};
