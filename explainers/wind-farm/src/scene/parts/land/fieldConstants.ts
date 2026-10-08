import { FARM_TERRAIN, TURBINE_LAND } from '../../../model/layout';
import { THEME } from '../../../theme';
import type { FieldPlan } from './fieldPlan';

export interface Stripes {
  readonly spacing: number;
  readonly width: number;
  readonly shade: number;
  readonly alpha: number;
}

const FURROWS: Stripes = { spacing: 6, width: 2.4, shade: 0.7, alpha: 0.4 };
const TRAMLINES: Stripes = { spacing: 24, width: 1.6, shade: 0.84, alpha: 0.45 };
const SWATHS: Stripes = { spacing: 10, width: 3.5, shade: 1.15, alpha: 0.3 };

export const FIELD_KINDS: readonly { readonly colour: string; readonly stripes?: Stripes }[] = [
  { colour: THEME.grass },
  { colour: THEME.grassDark },
  { colour: '#a1b96b', stripes: TRAMLINES },
  { colour: THEME.field, stripes: TRAMLINES },
  { colour: '#d2c391', stripes: SWATHS },
  { colour: '#8b6f50', stripes: FURROWS },
  { colour: '#a39a6a' },
];

export const CANOPY_TILE = {
  size: 96,
  crowns: 90,
  radius: [2.2, 4],
  lift: 0.9,
  highlight: 0.6,
  shadow: 'rgba(44,62,32,0.55)',
  light: 'rgba(118,146,84,0.4)',
  seed: 17,
} as const;

export const FARMSTEAD_ROOFS = ['#6b6a6c', '#9c5b43', '#85827b', '#b9b2a4', '#7a4c3c'] as const;

export const GROUND_PAINT = {
  base: THEME.grass,
  canopy: THEME.trees,
  canopyEdge: '#3f5a2e',
  hedge: '#45602f',
  track: '#c7b994',
  yard: '#b7ad93',
  gravel: THEME.gravel,
  distance: '#a4b298',
  mean: '#9eaa6e',
  acrossShade: 0.08,
  hedgeWidth: 4,
  trackWidth: 4,
  accessWidth: 5,
  canopyEdgeWidth: 3,
} as const;

const FARMSTEAD = {
  share: 0.85,
  offset: [28, 50],
  yard: [45, 75],
  buildings: [2, 4],
  length: [14, 40],
  width: [8, 15],
  spread: 26,
} as const;

const HEDGE = { share: 0.74, run: [40, 220], gapChance: 0.3, gap: [8, 26] } as const;

export const FARM_FIELDS: FieldPlan = {
  bounds: FARM_TERRAIN,
  size: [420, 1000],
  block: 2400,
  angles: [0.22, 0.52, -0.14, 0.9],
  cutShare: [0.32, 0.68],
  cutJitter: 0.1,
  woodShare: 0.05,
  hedge: HEDGE,
  track: { count: 8, minLength: 900 },
  farmstead: FARMSTEAD,
  look: {
    weights: [0.28, 0.2, 0.15, 0.17, 0.07, 0.04, 0.09],
    muting: 0.3,
    toneSpread: 0.08,
    hedgeMuting: 0.45,
  },
  seed: 29,
};

const TURBINE_REACH = TURBINE_LAND.radius;

export const TURBINE_FIELDS: FieldPlan = {
  bounds: { minX: -TURBINE_REACH, maxX: TURBINE_REACH, minZ: -TURBINE_REACH, maxZ: TURBINE_REACH },
  size: [230, 560],
  near: { scale: 0.42, from: 250, to: 1800 },
  block: 1100,
  angles: [0.38, 0.1, 0.7, -0.25],
  cutShare: [0.32, 0.68],
  cutJitter: 0.09,
  woodShare: 0.045,
  hedge: HEDGE,
  track: { count: 4, minLength: 700 },
  farmstead: FARMSTEAD,
  look: {
    weights: [0.24, 0.17, 0.13, 0.16, 0.07, 0.13, 0.1],
    muting: 0.08,
    toneSpread: 0.14,
    hedgeMuting: 0.1,
  },
  seed: 11,
};
