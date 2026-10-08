import { THEME } from '../../../theme';

export const FLOW_LOOK = {
  line: THEME.wind,
  dash: '#eaf6ff',
  chevron: '#f4fbff',
} as const;

export const STREAMLINES = {
  startX: -450,
  endX: 900,
  samples: 140,
  rowsAcross: [-0.8, -0.28, 0.28, 0.9],
  columnsAcross: [-1.6, -0.9, -0.3, 0.3, 0.9, 1.6],
  maxInduction: 0.4,
  inductionStep: 0.01,
  floorY: 32,
  floorBlend: 12,
  dashPeriod: 55,
  dashShare: 0.45,
  lineOpacity: 0.45,
  fade: [0.08, 0.9],
  minWidth: 0.8,
  widthPerMetre: 0.004,
  playback: 4,
  labelAt: [-250, 172, 0],
} as const;

export const ARROW_LOOK = {
  edge: 0.18,
  halo: 0.6,
  bodyOpacity: 0.5,
  haloOpacity: 0.3,
  chevronSlope: 0.9,
  chevronShare: 0.3,
  tailFade: 0.18,
} as const;

export const WIND_ARROWS = {
  count: 9,
  spanZ: 5400,
  length: 480,
  headLength: 130,
  shaftHalf: 16,
  headHalf: 52,
  chevronHalf: 40,
  chevronPeriod: 110,
  margin: 30,
  playback: 12,
  labelLift: 60,
} as const;

export const SHEAR_ARROWS = {
  longest: 240,
  headLength: 34,
  shaftHalf: 3.5,
  headHalf: 10,
  chevronHalf: 7,
  chevronPeriod: 45,
  margin: 8,
  playback: 6,
  mastTop: 195,
  mastRadius: 1.6,
  curveRadius: 1.8,
  curveSegments: 64,
  curveSides: 6,
  labelAt: [0, 215, 0],
} as const;

export const GROUND_ARROW = {
  offsetX: 700,
  length: 620,
  headLength: 230,
  shaftHalf: 55,
  headHalf: 140,
  chevrons: 2,
  chevronGap: 70,
  chevronDepth: 90,
  chevronThickness: 38,
  lift: 2,
  maxEdge: 45,
  tessellateSteps: 16,
  bearingStep: 0.25,
  opacity: 0.85,
  labelLift: 40,
} as const;
