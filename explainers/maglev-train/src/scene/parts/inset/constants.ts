import { THEME } from '../../../theme';

export const INSET_GROUP = 'gapInset';

export const LAYER = {
  leader: 59,
  ground: 60,
  cantilever: 61,
  stator: 62,
  cables: 63,
  field: 64,
  outline: 65,
  magnetBody: 66,
  magnetFade: 67,
  poles: 68,
  tolerance: 69,
  bracket: 70,
  thrustHalo: 71,
  thrust: 72,
  text: 73,
  frame: 74,
} as const;

export const LAYER_DEPTH = 0.0015;

export const INK = {
  ground: THEME.inset,
  frame: THEME.insetLine,
  cantilever: '#6b7580',
  stator: '#5a6672',
  statorEdge: '#a9b8c8',
  sheath: '#161b21',
  insulation: '#c9d1d9',
  conductor: '#9aa5b0',
  core: '#5d6670',
  coil: '#a46a3a',
  coilTurn: '#835228',
  fade: '#0b0f14',
  north: '#c8463d',
  south: '#3b6fc2',
  poleLetter: '#ffffff',
  tolerance: THEME.regen,
  bracket: THEME.insetLine,
  plate: 'rgba(9, 13, 18, 0.92)',
  text: '#ffffff',
  thrust: '#ffffff',
  thrustHalo: '#0b1016',
} as const;

export const OPACITY = {
  ground: 0.93,
  toleranceFill: 0.2,
  toleranceEdge: 0.9,
  field: 0.95,
  leader: 0.85,
  wedge: 0.07,
  thrustHalo: 0.8,
  fade: 0.85,
} as const;

export const STROKE = {
  frame: 0.018,
  edge: 0.008,
  tolerance: 0.007,
  bracket: 0.011,
  tick: 0.14,
  arrowLength: 0.045,
  arrowWidth: 0.04,
  leaderRadius: 0.012,
  dash: 0.05,
  dashGap: 0.035,
} as const;

export const PANEL_CORNER = 0.07;

export const GAP_PLATE = {
  width: 0.46,
  height: 0.14,
  pixelsPerMetre: 900,
  fontShare: 0.62,
  ink: INK.text,
  plate: INK.plate,
  rim: THEME.insetLine,
} as const;

export const BRACKET_X = 0.92;
export const PLATE_GAP = 0.05;
