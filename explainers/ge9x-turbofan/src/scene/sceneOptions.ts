import type { SceneOptions } from '@core/scene/shell';
import { SCENE_LIMITS } from './constants';
import { keepsCutHit } from './parts/cut';

export const UNDIMMED_PARTS = ['person', 'coldStream', 'hotStream'] as const;

const DIM = { saturation: 0.3, brightness: 0.5, emissive: 0.25 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'top',
  highlight: { dim: DIM, undimmed: [...UNDIMMED_PARTS] },
  occlusionHitFilter: keepsCutHit,
};
