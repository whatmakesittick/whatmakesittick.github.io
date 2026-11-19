import type { SceneOptions } from '@core/scene/shell';
import { THEME } from '../theme';
import { SCENE_LIMITS } from './constants';

export const UNDIMMED_PARTS = ['bite', 'aromaCloud'] as const;

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
  highlight: { undimmed: [...UNDIMMED_PARTS] },
};
