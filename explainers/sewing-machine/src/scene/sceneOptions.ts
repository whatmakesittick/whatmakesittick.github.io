import type { SceneOptions } from '@core/scene/shell';
import { CAMERA_DISTANCE_MM, SCENE_UNITS_PER_MM } from './constants';

export const SCENE_OPTIONS: SceneOptions = {
  camera: {
    distance: {
      min: CAMERA_DISTANCE_MM.min * SCENE_UNITS_PER_MM,
      max: CAMERA_DISTANCE_MM.max * SCENE_UNITS_PER_MM,
    },
  },
};
