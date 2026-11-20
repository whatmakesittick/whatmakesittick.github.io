import type { Intersection, Object3D } from 'three';
import type { SceneOptions } from '@core/scene/shell';
import { THEME } from '../theme';
import { SCENE_LIMITS } from './constants';
import { FORCE_ARROWS_NAME } from './parts/forces';
import { HAND_PATH_NAME } from './parts/handPath';
import { isNearRope } from './parts/pool/ropes';

const SWIMMER_DIM = { saturation: 0.8, brightness: 0.82, emissive: 0.3 } as const;

const SEE_THROUGH_GROUPS: readonly string[] = [FORCE_ARROWS_NAME, HAND_PATH_NAME];

function isOverlay(object: Object3D | null): boolean {
  if (!object) return false;
  return SEE_THROUGH_GROUPS.includes(object.name) || isOverlay(object.parent);
}

export function blocksLabels(hit: Intersection): boolean {
  return !isOverlay(hit.object) && !isNearRope(hit.object, hit.distance);
}

export const UNDIMMED_PARTS = ['waterline', 'laneRope', 'laneLine'] as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.sceneBackground,
  fog: { color: THEME.sceneBackground, near: SCENE_LIMITS.fogNear, far: SCENE_LIMITS.fogFar },
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'right',
  occlusionHitFilter: blocksLabels,
  highlight: { dim: SWIMMER_DIM, undimmed: [...UNDIMMED_PARTS] },
};
