import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { SceneOptions } from '@core/scene/shell';
import { THEME } from '../theme';

const FOG = { near: 26, far: 60 } as const;
const CAMERA = {
  near: 0.02,
  far: 120,
  minDistance: 0.4,
  maxDistance: 36,
  floorMargin: 0.05,
  maxPolarAngle: Math.PI * 0.68,
} as const;
const HIGHLIGHT_DIM = { saturation: 0.3, brightness: 0.5, emissive: 0.25 } as const;

export const BEAM_GROUP = 'flash';
export const UNDIMMED_GROUPS = [
  UNDIMMED_GROUP,
  BEAM_GROUP,
  'plasma',
  'dropletInset',
  'patternInset',
  'hair',
  'virus',
];

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.background,
  fog: { color: THEME.background, ...FOG },
  stage: false,
  gaugeSide: 'right',
  camera: {
    near: CAMERA.near,
    far: CAMERA.far,
    floorMargin: CAMERA.floorMargin,
    maxPolarAngle: CAMERA.maxPolarAngle,
    distance: { min: CAMERA.minDistance, max: CAMERA.maxDistance },
  },
  highlight: { dim: HIGHLIGHT_DIM, undimmed: UNDIMMED_GROUPS },
};
