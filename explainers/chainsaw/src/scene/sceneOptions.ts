import type { SceneOptions } from '@core/scene/shell';
import type { PartId } from '../ids';
import { SCENE_LIMITS, SEE_THROUGH_DIM } from './constants';

export const UNDIMMED_PARTS: readonly PartId[] = [
  'log',
  'chips',
  'freshCharge',
  'exhaustGas',
  'oilFlow',
];

export const SCENE_OPTIONS: SceneOptions = {
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    floorMargin: SCENE_LIMITS.floorMargin,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'top',
  highlight: { dim: SEE_THROUGH_DIM, undimmed: UNDIMMED_PARTS },
};
