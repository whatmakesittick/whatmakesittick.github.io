import type { SceneOptions } from '@core/scene/shell';
import { SCENE_LIMITS, SKY_COLOR } from './constants';

export const SCENE_OPTIONS: SceneOptions = {
  background: SKY_COLOR,
  fog: { color: SKY_COLOR, near: SCENE_LIMITS.fogNear, far: SCENE_LIMITS.fogFar },
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
  },
};
