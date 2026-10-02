import type { SceneOptions } from '@core/scene/shell';
import { THEME } from '../theme';
import { HAZE, HIGHLIGHT_DIM, SCENE_LIMITS, UNDIMMED_PARTS } from './constants';

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.skyHorizon,
  fog: { color: THEME.skyHorizon, near: HAZE.near, far: HAZE.far },
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
    floorMargin: SCENE_LIMITS.targetFloorMargin,
  },
  gaugeSide: 'right',
  highlight: { dim: HIGHLIGHT_DIM, undimmed: UNDIMMED_PARTS },
};
