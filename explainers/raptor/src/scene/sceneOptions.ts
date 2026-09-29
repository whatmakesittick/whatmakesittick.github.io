import type { SceneOptions } from '@core/scene/shell';
import { STREAM_IDS } from '../ids';

const CAMERA = {
  near: 2,
  far: 30000,
  maxPolarAngle: Math.PI * 0.92,
  distance: { min: 60, max: 8000 },
} as const;
const DIM = { saturation: 0.35, brightness: 0.55, emissive: 0.3, opacity: 0.35 } as const;
const UNDIMMED = [...STREAM_IDS, 'plume', 'shockDiamonds'] as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: '#070b16',
  stage: false,
  camera: CAMERA,
  highlight: { dim: DIM, undimmed: UNDIMMED },
};
