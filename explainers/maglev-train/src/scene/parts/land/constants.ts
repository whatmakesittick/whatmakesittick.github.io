import { BEAM_M, FIELD_PERIOD_M } from '../../../model';
import { HAZE, SCENE_LIMITS } from '../../constants';

const FOG_EDGE_ANGLE_COS = 0.55;
const BEAMS_PER_TILE = Math.round((2 * FIELD_PERIOD_M) / BEAM_M);

export const GROUND_REACH = Math.ceil(
  SCENE_LIMITS.cameraMaxDistance + HAZE.far / FOG_EDGE_ANGLE_COS,
);

export const TILE_M = BEAMS_PER_TILE * BEAM_M;

export function pierGap(index: number): number {
  return (index + 0.5) * BEAM_M;
}

export const GROUND = {
  period: TILE_M,
  reach: GROUND_REACH,
  rows: 256,
  texture: { size: 2048, roughSize: 1024, shadeSize: 1024, softness: 45, anisotropy: 8 },
} as const;

export const SCENERY = {
  reach: 1300,
  treeReach: 1000,
  villagePeriod: TILE_M * 3,
  distantPeriod: TILE_M * 4,
} as const;

export const CORRIDOR = {
  verge: 8,
  fence: 8.6,
  fenceWidth: 0.25,
  service: [9.6, 13.2],
  ghostVerge: [-21.6, -8.6],
  formation: [-17.4, -10.6],
  ditch: [-20.7, -19.1],
  mowStripe: 2.4,
} as const;

export const CLEAR = { left: -84, right: 36 } as const;

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
