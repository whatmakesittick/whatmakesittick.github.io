import type { SceneOptions } from '@core/scene/shell';
import type { PartId } from '../ids';
import { HAZE, HIGHLIGHT_DIM, SCENE_LIMITS } from './constants';

const UNDIMMED: readonly PartId[] = ['satLink', 'losLink', 'laserBeam', 'missile'];

export const SCENE_OPTIONS: SceneOptions = {
  background: HAZE.colour,
  fog: { color: HAZE.colour, near: HAZE.near, far: HAZE.far },
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'top',
  highlight: { dim: HIGHLIGHT_DIM, undimmed: UNDIMMED },
};
