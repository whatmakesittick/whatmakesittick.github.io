import type { SceneOptions } from '@core/scene/shell';
import { THEME } from '../theme';
import { DUSK_DIM, SCENE_LIMITS, UNDIMMED_PARTS } from './constants';

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.fog,
  fog: { color: THEME.fog, near: SCENE_LIMITS.fogNear, far: SCENE_LIMITS.fogFar },
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
    floorMargin: SCENE_LIMITS.targetFloorMargin,
  },
  gaugeSide: 'right',
  highlight: { dim: DUSK_DIM, undimmed: UNDIMMED_PARTS },
};
