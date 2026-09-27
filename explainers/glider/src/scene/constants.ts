import { toRadians } from '@core/math';
import { CUMULUS_BASE, GLIDERS, GLIDER_TYPES } from '../model';
import { THEME } from '../theme';

export const METRES_PER_UNIT = 20;
export const GLIDER_UNITS_PER_METRE = 1.35;
export const FLOOR_HEIGHT = 0;
export const GLIDER_PRESENCE = { minFrameShare: 0.21, maxScale: 2 } as const;

export const SKY_COLOR = '#79a3cf';

export const SCENE_LIMITS = {
  fogNear: 900,
  fogFar: 2600,
  cameraNear: 1,
  cameraFar: 6000,
  cameraMinDistance: 35,
  cameraMaxDistance: 1040,
  maxPolarAngle: Math.PI * 0.62,
} as const;

export const KEY_LIGHT = {
  color: '#ffe2b8',
  intensity: 2.8,
  position: [60, 280, 300],
} as const;

export const FUSELAGE = {
  profile: [
    [2.9, 0],
    [2.75, 0.2],
    [2.45, 0.33],
    [1.9, 0.4],
    [1.0, 0.4],
    [0.3, 0.32],
    [-0.6, 0.2],
    [-1.8, 0.13],
    [-3.4, 0.09],
    [-4.0, 0.06],
  ],
  profileSamples: 26,
  radialSegments: 18,
  heightScale: 1.15,
  girth: 1.6,
  canopyStart: 1.05,
  canopyEnd: 2.62,
  canopyInflate: 1.03,
  canopyArc: Math.PI * 0.9,
  canopyRaise: 0.06,
  noseFrom: 2.4,
  noseInflate: 1.015,
} as const;

export const WING = {
  rootX: 0.35,
  rootY: 0.32,
  rootChordShare: 1.35,
  tipChordShare: 0.65,
  chordEmphasis: 2,
  thickness: 0.15,
  dihedral: toRadians(3),
  tipShare: 0.9,
  labelShare: 0.6,
} as const;

export const TAIL = {
  finThickness: 0.07,
  fin: [
    [-3.25, 0.05],
    [-3.72, 1.3],
    [-4.12, 1.3],
    [-4.0, 0.0],
  ],
  finTip: [
    [-3.59, 0.95],
    [-3.72, 1.3],
    [-4.12, 1.3],
    [-4.09, 0.95],
  ],
  finTipThickness: 0.09,
  stabilizerX: -3.95,
  stabilizerY: 1.34,
  stabilizerSpan: 2.8,
  stabilizerChord: 0.55,
  stabilizerThickness: 0.1,
} as const;

export const FORCE_ARROWS = {
  weightLength: 9.9,
  dragEmphasis: 26,
  shaftRadius: 0.34,
  headRadius: 0.85,
  headLength: 2,
  dragDrop: -0.7,
  radialSegments: 12,
  labelLift: 0.6,
} as const;

export const TERRAIN = {
  crestHeight: 1100,
  halfWidth: 440,
  halfDepth: 320,
  cell: 8,
  farGround: 3200,
  sink: -0.6,
  windwardRun: 72,
  leeRun: 52,
  ridgeHalfLength: 170,
  ridgeFade: 70,
  crestWobble: 0.035,
  crestWobbleWavelength: 41,
  hillHeight: 38,
  hillMargin: 110,
  hillWavelength: 57,
} as const;

export const FIELDS = {
  minSize: 16,
  maxSize: 38,
  hedge: 0.9,
  lift: 0.08,
  darkFieldWidth: 144,
  darkFieldDepth: 130,
  darkFieldMargin: 8,
  darkFieldLift: 0.14,
  regions: [
    { from: -320, to: -84 },
    { from: 64, to: 320 },
  ],
  halfDepth: 200,
} as const;

export const TERRAIN_COLORS = {
  grass: '#6a8a4a',
  forest: '#557a45',
  rock: '#8c8778',
  hill: '#5d7a45',
  farGround: '#62824a',
  darkField: '#3d2c22',
  fields: ['#7f9c52', '#93aa5e', '#a8aa62', '#6b8b47', '#a19c57', '#b8ae6c', '#869f4f'],
} as const;

export const COLUMN = {
  bottomRadius: 54,
  topRadius: 63,
  radialSegments: 28,
  heightSegments: 6,
  opacity: 0.12,
} as const;

export const CUMULUS = {
  puffs: [
    [0, 0, 0, 47],
    [41, 0, 17, 34],
    [-40, 0, -14, 34],
    [14, 0, -41, 31],
    [-17, 0, 40, 31],
    [55, 0, -30, 26],
    [-55, 0, 30, 26],
    [71, 0, 10, 19],
    [-67, 0, -17, 19],
    [11, 24, 6, 31],
    [-14, 19, -11, 30],
    [31, 14, -10, 24],
  ],
  downwind: 5,
  alongWind: 0.85,
  acrossWind: 0.7,
  labelHeight: 14,
  labelReach: 54,
  widthSegments: 12,
  heightSegments: 6,
} as const;

const WINGTIP_BANK = toRadians(48);
const LARGEST_SPAN = Math.max(...GLIDER_TYPES.map((type) => GLIDERS[type].span));
const WINGTIP_RISE = (LARGEST_SPAN / 2) * GLIDER_UNITS_PER_METRE * Math.sin(WINGTIP_BANK);

export const CLOUD_BASE_Y = CUMULUS_BASE / METRES_PER_UNIT + WINGTIP_RISE;

export const ROTOR_CLOUD = {
  x: 104,
  y: 58,
  halfLength: 18,
  radius: 8,
  puffCount: 24,
  puffRadius: [3.2, 6] as const,
  turnsPerLoop: 9,
  detail: 1,
  labelShare: 0.55,
} as const;

export const LENTICULAR = {
  x: 110,
  y: 146,
  plates: [
    { x: 0, y: 0, length: 46, thickness: 4.6, depth: 28 },
    { x: 2, y: 5, length: 36, thickness: 3.4, depth: 22 },
    { x: -1, y: 9, length: 24, thickness: 2.4, depth: 15 },
  ],
  labelShare: 0.55,
  widthSegments: 40,
  heightSegments: 12,
} as const;

export const WAVE = {
  troughX: 50,
  wavelength: 120,
  damping: 320,
  startX: -110,
  endX: 300,
  depths: [-46, 14],
  particleDepth: [-52, 22],
  lowest: 62,
  highest: 170,
  lines: 8,
  peakAmplitude: 22,
  amplitudeFloor: 40,
  amplitudeSpan: 165,
  labelX: 80,
  labelY: 120,
} as const;

export const RIDGE_FLOW = {
  startX: -150,
  endX: 70,
  heights: [3, 10, 19],
  lanes: [-36, -18, 0, 18, 36],
  laneJitter: 1.5,
} as const;

export const WIND_ARROWS = {
  x: -64,
  length: 16,
  shaftRadius: 0.8,
  headRadius: 2,
  headLength: 4.5,
  positions: [
    [14, -30],
    [30, 0],
    [14, 30],
    [46, -18],
    [46, 18],
  ],
  labelIndex: 1,
  radialSegments: 10,
} as const;

export const PARTICLES = {
  thermal: { count: 300, size: 1.8, opacity: 0.7, fade: 0.12, spread: 0.92 },
  ridge: { count: 420, size: 2.4, opacity: 0.9, fade: 0.1 },
  wave: { count: 520, size: 3.2, opacity: 0.9, fade: 0.08 },
  lineOpacity: 0.5,
  lineSamples: 120,
  slopeForFullTone: 0.6,
} as const;

export const AIR_TONES = {
  rising: THEME.rising,
  sinking: THEME.sinking,
  neutral: '#f2f6fa',
} as const;

export const RENDER_ORDER = { column: 1, lines: 2, particles: 3 } as const;

export const HAZE_DIM = { saturation: 0.3, brightness: 0.8 } as const;
