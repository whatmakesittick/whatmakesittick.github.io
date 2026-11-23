import type { Intersection, Object3D } from 'three';
import type { SceneOptions } from '@core/scene/shell';
import { THEME } from '../theme';
import { SCENE_LIMITS } from './constants';
import { OVERLAY_NAMES } from './parts/overlays/names';

const RUNNER_DIM = { saturation: 0.8, brightness: 0.82, emissive: 0.3 } as const;

function isOverlay(object: Object3D | null): boolean {
  if (!object) return false;
  return OVERLAY_NAMES.includes(object.name) || isOverlay(object.parent);
}

export function blocksLabels(hit: Intersection): boolean {
  return !isOverlay(hit.object);
}

export const UNDIMMED_GROUPS = ['backdrop'] as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.haze,
  fog: { color: THEME.haze, near: SCENE_LIMITS.fogNear, far: SCENE_LIMITS.fogFar },
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'top',
  occlusionHitFilter: blocksLabels,
  highlight: { dim: RUNNER_DIM, undimmed: [...UNDIMMED_GROUPS] },
};
