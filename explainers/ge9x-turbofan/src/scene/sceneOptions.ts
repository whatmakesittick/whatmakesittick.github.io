import type { SceneOptions } from '@core/scene/shell';
import { HALL_LOOK, SCENE_LIMITS } from './constants';
import type { Intersection } from 'three';
import { keepsCutHit } from './parts/cut';
import { isGlowHit } from './parts/effects';

export const UNDIMMED_PARTS = ['person', 'coldStream', 'hotStream'] as const;

const DIM = { saturation: 0.3, brightness: 0.5, emissive: 0.25 } as const;

function keepsVisibleHit(hit: Intersection): boolean {
  return keepsCutHit(hit) && !isGlowHit(hit);
}

export const SCENE_OPTIONS: SceneOptions = {
  background: HALL_LOOK.background,
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'top',
  highlight: { dim: DIM, undimmed: [...UNDIMMED_PARTS] },
  occlusionHitFilter: keepsVisibleHit,
};
