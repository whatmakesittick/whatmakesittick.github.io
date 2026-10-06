import { THEME } from '../../../theme';

export const FIELD_LINES = {
  innerRadii: [0.25, 0.1],
  planes: 4,
  planeStart: Math.PI / 2,
  outerClearance: 0.16,
  outerStep: 0.42,
  capClearance: 0.22,
  capStep: 0.42,
  straightSamples: 10,
  capSamples: 16,
  tubeRadius: 0.0055,
  tubularSegments: 128,
  radialSegments: 5,
  dashPeriod: 0.2,
  dashDuty: 0.45,
  flowSpeed: 0.6,
  opacity: 0.55,
  insideBoost: 1.7,
  floorFade: 0.12,
  colour: THEME.fieldLine,
} as const;

export const FRINGE = {
  segments: 192,
  halfWidth: 0.012,
  lift: 0.004,
  dashes: 56,
  dashDuty: 0.55,
  opacity: 0.9,
  colour: THEME.fringe,
} as const;

export const VOXEL_LOOK = {
  edgeColour: '#eaf6ff',
  edgeGlow: 1.8,
  edgeRadius: 0.0055,
  edgeSegments: 6,
  backdrop: '#03070d',
  glassOpacity: 0.92,
  glassGlow: 0.06,
  arrowFill: 1,
  arrowShaftRadius: 0.012,
  arrowHeadRadius: 0.027,
  arrowHeadShare: 0.36,
  arrowSegments: 8,
  emissiveIntensity: 0.35,
  leaderRadius: 0.008,
  leaderCore: '#0b1622',
  leaderCoreRadius: 0.005,
  leaderDash: 0.035,
  leaderGap: 0.025,
  targetRadius: 0.02,
  targetSegments: 12,
} as const;

export const NET_ARROW = {
  scale: 0.95,
  shaftRadius: 0.026,
  headRadius: 0.062,
  headLength: 0.12,
  segments: 20,
  emissiveIntensity: 0.3,
  ghostOpacity: 0.75,
  renderOrder: 3,
  colour: THEME.netMagnet,
} as const;

export const FIELD_ARROW = {
  shaftRadius: 0.024,
  headRadius: 0.062,
  headLength: 0.12,
  segments: 16,
  emissiveIntensity: 0.35,
  colour: THEME.mainField,
} as const;

export const RF_RINGS = {
  colour: THEME.rf,
  segments: 64,
  innerRadius: 0.1,
  rings: { 90: 3, 180: 4 },
  band: { 90: 0.2, 180: 0.32 },
  strength: { 90: 0.85, 180: 1 },
  speed: 0.7,
  edge: 2.4,
} as const;

export const ECHO_RINGS = {
  colour: THEME.echo,
  segments: 64,
  skinGap: 0.01,
  reach: 0.16,
  rings: 4,
  band: 0.3,
  floor: 0.6,
  speed: 0.9,
  edge: 2.4,
} as const;

export const RING_GLOW = { brightness: 1.5, core: 3 } as const;

export const SLICE = {
  colour: THEME.slice,
  span: 0.42,
  haloThickness: 0.06,
  coreOpacity: 0.9,
  haloOpacity: 0.35,
  soft: 0.2,
  easeRate: 6,
  settle: 0.01,
} as const;

export const HALO = { width: 2.4, opacity: 0.45 } as const;
