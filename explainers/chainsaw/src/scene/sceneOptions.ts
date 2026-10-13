import type { SceneOptions } from '@core/scene/shell';
import { FOREST, SCENE_LIMITS, SEE_THROUGH_DIM } from './constants';
import { UNDIMMED_PARTS } from './partInfo';

export const SCENE_OPTIONS: SceneOptions = {
  background: FOREST.haze,
  fog: { color: FOREST.haze, near: FOREST.hazeNear, far: FOREST.hazeFar },
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    floorMargin: SCENE_LIMITS.floorMargin,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'top',
  highlight: { dim: SEE_THROUGH_DIM, undimmed: UNDIMMED_PARTS },
};
