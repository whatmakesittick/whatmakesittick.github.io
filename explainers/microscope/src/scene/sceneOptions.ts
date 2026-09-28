import type { SceneOptions } from '@core/scene/shell';
import { CAMERA } from './constants';

export const SCENE_OPTIONS: SceneOptions = {
  camera: {
    near: CAMERA.near,
    far: CAMERA.far,
    distance: { min: CAMERA.minDistance, max: CAMERA.maxDistance },
  },
};
