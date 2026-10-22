import { FIELD_PERIOD_M } from '../../../model';
import { HAZE, SCENE_LIMITS } from '../../constants';

const FOG_EDGE_ANGLE_COS = 0.55;

export const GROUND_REACH = Math.ceil(
  SCENE_LIMITS.cameraMaxDistance + HAZE.far / FOG_EDGE_ANGLE_COS,
);

export const GROUND = {
  period: FIELD_PERIOD_M * 2,
  reach: GROUND_REACH,
  colour: '#7e8a5c',
} as const;

export const SKY_DOME = {
  widthSegments: 48,
  heightSegments: 24,
  renderOrder: -1000,
  rise: 3.2,
  band: 0.02,
  haze: { colour: '#e9e2d4', height: 0.09, strength: 0.45 },
  glow: { colour: '#ffe6c2', wide: 0.55, wideTightness: 5, core: 0.9, coreTightness: 160 },
  horizonWarmth: { strength: 0.35, tightness: 3 },
  clouds: {
    scale: 1.1,
    lift: 0.12,
    cover: 0.52,
    softness: 0.22,
    band: [0.04, 0.6],
    strength: 0.42,
    heading: 0.35,
    stretch: [0.35, 2.6],
    lit: '#fff4e4',
    shade: '#c9d4de',
  },
} as const;
