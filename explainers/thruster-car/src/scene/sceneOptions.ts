import { toRadians } from '@core/math';
import type { SceneOptions } from '@core/scene/shell';
import { SITE } from '../model';
import { THEME } from '../theme';
import { UNDIMMED_PARTS } from './partInfo';

const SCENE_LIMITS = {
  fogFar: 900,
  cameraNear: 0.1,
  cameraFar: 1000,
  cameraMinDistance: 2,
  cameraMaxDistance: 800,
  maxPolarAngle: toRadians(95),
} as const;

const DUSK_DIM = { saturation: 0.3, brightness: 0.8 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.skyMiddle,
  fog: { color: THEME.fog, near: SITE.fogNear, far: SCENE_LIMITS.fogFar },
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'right',
  highlight: { dim: DUSK_DIM, undimmed: UNDIMMED_PARTS },
};
