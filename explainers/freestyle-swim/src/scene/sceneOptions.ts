import type { SceneOptions } from '@core/scene/shell';
import { THEME } from '../theme';
import { SCENE_LIMITS } from './constants';

const SWIMMER_DIM = { saturation: 0.35, brightness: 0.68, emissive: 0.3 } as const;

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
  gaugeSide: 'top',
  highlight: { dim: SWIMMER_DIM, undimmed: [...UNDIMMED_PARTS] },
};
