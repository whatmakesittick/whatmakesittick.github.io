import type { SceneOptions } from '@core/scene/shell';
import { THEME } from '../theme';
import { BACKDROP } from './constants';

const CAMERA = {
  near: 2,
  far: 12000,
  distance: { min: 60, max: 4000 },
} as const;
const DIM = { saturation: 0.35, brightness: 0.6, emissive: 0.3 } as const;
const UNDIMMED = ['hotGas'] as const;

const FOG = { color: BACKDROP.fog.colour, near: BACKDROP.fog.near, far: BACKDROP.fog.far } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.background,
  fog: FOG,
  stage: false,
  camera: CAMERA,
  gaugeSide: 'top',
  highlight: { dim: DIM, undimmed: UNDIMMED },
};
