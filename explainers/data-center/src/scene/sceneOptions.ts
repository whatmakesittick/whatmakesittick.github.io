import type { SceneOptions } from '@core/scene/shell';
import { THEME } from '../theme';
import { HAZE, HIGHLIGHT_DIM, SCENE_LIMITS } from './constants';
import { SITE_GROUP } from './parts/context';

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.sky,
  fog: HAZE,
  stage: false,
  gaugeSide: 'right',
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  highlight: { dim: HIGHLIGHT_DIM, undimmed: [SITE_GROUP] },
};
