import { toRadians } from '@core/math';
import { DRILL_FLOOR_Y } from '../model/scale';

export const DRILLING_DRAFT_M = 21;
export const TRANSIT_DRAFT_M = 9.5;

export const SEGMENTS = { tube: 24, halfTube: 14, pipe: 10, rod: 8, round: 12, wire: 5 } as const;

export const RENDER_ORDER = {
  sky: -10,
  water: 1,
  sea: 2,
  particles: 3,
  bubbles: 4,
  glow: 5,
  labels: 6,
} as const;

export const SKY = {
  radius: 2600,
  widthSegments: 32,
  heightSegments: 24,
  zenith: '#5f9ed8',
  horizon: '#d6e8f4',
  shallow: '#2f6f9c',
  deep: '#0a2238',
  horizonBand: 0.08,
  deepBand: 0.45,
  skyBand: 0.4,
} as const;

export const BLOCK = { halfWidth: 200, back: -150, front: 150, cutZ: 0 } as const;

export const SEA = {
  cell: 5,
  waves: [
    { amplitude: 0.32, length: 36, angle: 0.35, speed: 1.05 },
    { amplitude: 0.2, length: 19, angle: -0.95, speed: 1.55 },
    { amplitude: 0.1, length: 9.5, angle: 1.9, speed: 2.4 },
  ],
  topShade: '#3b8fc0',
  bottomShade: '#0d3453',
} as const;

export const HULL = {
  keelY: -DRILLING_DRAFT_M,
  pontoon: { length: 110, width: 18, height: 9, offset: 30.5 },
  column: { size: 17, chamfer: 2.6, offset: 30.5 },
  deck: { size: 78, underside: 12, top: 18, moonpoolX: 9, moonpoolZ: 12, trim: 0.9 },
  waterline: { halfBand: 1.1, markStep: 1, markFrom: -7, markTo: 5, markWidth: 1.4 },
  railing: { height: 1.1, post: 0.12, rail: 0.1, spacing: 3 },
} as const;

export const PONTOON_TOP = HULL.keelY + HULL.pontoon.height;

export const BRACING = {
  radius: 1.15,
  nodeRadius: 1.7,
  nodeLength: 3.2,
  horizontalY: -7,
  diagonalLowY: -5,
  diagonalTopZ: 7,
} as const;

export const THRUSTER = {
  xs: [46, 36],
  zSpread: 4.2,
  strut: { radius: 0.8, length: 2.4 },
  pod: { radius: 1.25, length: 5.2 },
  nozzle: { radius: 2.2, thickness: 0.35, length: 2.3 },
  blade: { length: 1.8, width: 0.9, thickness: 0.15 },
  blades: 4,
  headings: [0.4, -0.3, 2.6, -2.8],
} as const;

export const DRILL_FLOOR = {
  halfX: 10,
  halfZ: 9,
  thickness: 0.7,
  leg: 1.1,
  legInsetX: 8.6,
  legInsetZ: 7.6,
  rotaryRadius: 1.6,
  holeRadius: 2.6,
} as const;

export const DERRICK = {
  baseHalf: 6,
  topHalf: 2.2,
  height: 61,
  panels: 8,
  leg: 0.75,
  bar: 0.3,
  vDoorPanels: 2,
  crown: { half: 3.3, thickness: 1.1, sheaves: 5, sheaveRadius: 0.8, sheaveWidth: 0.35 },
  fingerboard: { height: 24, depth: 3.2, fingers: 9 },
  rails: { x: 2.3, halfGap: 0.8, size: 0.28, bottom: 2, top: 55 },
} as const;

export const DERRICK_TOP = DRILL_FLOOR_Y + DERRICK.height;

export const STRING = {
  standLength: 28,
  pipeInches: 5.5,
  toolJointInches: 7,
  collarInches: 8,
  slimCollarInches: 6.5,
  slimHoleInches: 10,
  collarLength: 150,
  toolJointHeight: 0.45,
  stabilizerDepths: [12, 55],
  stabilizerHeight: 0.9,
  stabilizerShare: 0.94,
  turnsPerSecond: 0.9,
} as const;

export const TOP_DRIVE = {
  quillLow: 3,
  liftShare: 0.12,
  width: 2.3,
  depth: 1.9,
  motorHeight: 3.4,
  gearHeight: 1.4,
  swivelHeight: 1.2,
  linkLength: 3.1,
  blockHeight: 3.6,
  blockWidth: 2.4,
  blockGap: 0.6,
  lines: 6,
  lineRadius: 0.07,
  parkedShare: 0.35,
} as const;

export const ACCOMMODATION = {
  minX: 15,
  maxX: 39,
  minZ: 13,
  maxZ: 39,
  floors: 4,
  floorHeight: 3,
  windowBand: 1.1,
  windowInset: 0.15,
} as const;

export const ACCOMMODATION_ROOF = HULL.deck.top + ACCOMMODATION.floors * ACCOMMODATION.floorHeight;

export const HELIDECK = {
  centreX: 31,
  centreZ: 31,
  radius: 11.5,
  sides: 8,
  legHeight: 3,
  thickness: 0.7,
  net: 1.6,
  netDrop: 0.5,
  legs: 6,
  legRadius: 0.35,
  textureSize: 512,
} as const;

export const HELIDECK_TOP = ACCOMMODATION_ROOF + HELIDECK.legHeight + HELIDECK.thickness;

export interface CraneSpec {
  x: number;
  z: number;
  heading: number;
  labelled: boolean;
}

export const CRANES: readonly CraneSpec[] = [
  { x: -30.5, z: 30.5, heading: toRadians(35), labelled: true },
  { x: 30.5, z: -30.5, heading: toRadians(200), labelled: false },
];

export const CRANE = {
  pedestal: { radius: 1.5, height: 9 },
  slew: { radius: 2.4, height: 1 },
  house: { length: 5, width: 3.6, height: 3.4 },
  boom: { length: 23, width: 1.3, pitch: toRadians(52) },
  jib: { length: 15, width: 0.9, pitch: toRadians(-38) },
  hookDrop: 9,
  cylinderRadius: 0.28,
} as const;

export const FLARE = {
  base: [-38.5, HULL.deck.top + 1.5, -36] as const,
  yaw: toRadians(160),
  pitch: toRadians(16),
  length: 44,
  width: 2.3,
  panels: 11,
  chord: 0.26,
  brace: 0.14,
  burnerRadius: 0.9,
  burnerLength: 2.2,
} as const;

export const FLAME = {
  length: 20,
  radius: 4.2,
  coreShare: 0.55,
  rise: toRadians(48),
  tongues: [
    { share: 0.62, yaw: 0.5, tilt: 0.35, lift: 0.1, phase: 1.3 },
    { share: 0.5, yaw: -0.6, tilt: -0.3, lift: 0.18, phase: 2.9 },
  ],
  glowSize: 34,
  glowOpacity: 0.55,
  flicker: [
    { rate: 7.3, depth: 0.08 },
    { rate: 11.9, depth: 0.05 },
    { rate: 3.1, depth: 0.06 },
  ],
} as const;

export interface LifeboatSpec {
  x: number;
  side: 1 | -1;
}

export const LIFEBOATS: readonly LifeboatSpec[] = [
  { x: -4, side: 1 },
  { x: 4.5, side: 1 },
  { x: 13, side: 1 },
  { x: 16, side: -1 },
  { x: 24.5, side: -1 },
  { x: 33, side: -1 },
];

export const LIFEBOAT = {
  length: 8.2,
  radius: 1.5,
  height: 0.9,
  outboard: 1.9,
  hangY: HULL.deck.top - 2.6,
  davit: 0.3,
} as const;

export const MOORING = {
  fairleadY: -9,
  cornerInset: 4.5,
  spread: toRadians(24),
  reach: 300,
  drop: 186,
  fadeShare: 0.72,
  wireRadius: 0.26,
  wireSegments: 48,
  link: { length: 1.15, width: 0.72, bar: 0.14, pitch: 0.82 },
  chainAlongLine: 22,
  windlassSize: 2.2,
} as const;

export const DECK_ITEMS = {
  catwalk: { width: 2.6, fromX: -DRILL_FLOOR.halfX, toX: -30, bottomY: HULL.deck.top + 0.8 },
  pipeDeck: { minX: -37, minZ: -13, maxZ: -3.5, layers: 3, perLayer: 16, radius: 0.12 },
  riserRack: { minX: -33, minZ: -37, rows: 2, perRow: 5, radius: 0.72 },
  setback: { rows: 5, columns: 6, radius: 0.1, spacing: 0.42, lean: 0.2 },
} as const;

export const WELL_TUBES = {
  minWall: 0.13,
  cementGap: 0.02,
  cementRiseM: 300,
  cementedToSeabed: 2,
  shoeHeight: 0.35,
  shoeLip: 0.08,
  linerInches: 7,
  linerLapM: 60,
  tubingInches: 4.5,
  packerInches: 7.6,
  packerHeight: 0.9,
  tubingAboveOilM: 30,
  packerAboveOilM: 55,
} as const;

export const CASING_WALL_INCHES: Readonly<Record<number, number>> = {
  30: 1,
  20: 0.635,
  13.375: 0.48,
  9.625: 0.47,
  7: 0.41,
  4.5: 0.27,
  21: 0.875,
};

export const DEFAULT_WALL_INCHES = 0.5;

export const WELLHEAD = {
  base: { half: 6.5, height: 0.8 },
  low: { radius: 3.75, height: 2.2 },
  high: { radius: 2.75, height: 1.8 },
} as const;

export const BOP = {
  connector: { radius: 3.3, height: 2.4 },
  ram: { half: 4.1, height: 2.8, gap: 0.35, count: 4 },
  bonnet: { radius: 1.3, length: 3.3 },
  operator: { radius: 1.7, length: 0.7 },
  annular: { radius: 4.3, height: 3.6, dome: 1.1 },
  lmrpConnector: { radius: 3.1, height: 2 },
  flexJoint: { radius: 2.5, height: 2.4 },
  adapter: { radius: 2.35, height: 1.4 },
  frame: { half: 6.4, post: 0.45, rail: 0.35 },
  pod: { width: 2.1, height: 4.4, depth: 1.8 },
  bottle: { radius: 0.55, height: 3.4 },
} as const;

export const RISER = {
  inches: 21,
  lineRadius: 0.34,
  lineOffset: 2.8,
  buoyancyInches: 50,
  moduleClearance: 0.12,
  moduleLength: 4.2,
  moduleGap: 0.45,
  buoyancyTopY: -26,
  buoyancyBottomY: -142,
  flangeRadius: 2.7,
  flangeHeight: 0.3,
  innerBarrel: { radius: 2.3, bottom: -8, top: 10 },
  outerBarrel: { radius: 2.85, wall: 0.3, bottom: -6, top: 12.5 },
  tensioner: { y: 6, radius: 3.9, height: 1.1, wires: 6, wireReach: 7.5, wireRadius: 0.08 },
  diverter: { radius: 2.4, bottom: 21.6, top: 24.2 },
} as const;

export const MOUND = {
  inner: 6.8,
  peak: 9.5,
  outer: 19,
  height: 3.4,
  steps: 9,
  segments: 16,
  jitter: 0.35,
  minGrowth: 0.08,
  seed: 3,
} as const;

export const ANTICLINE = { amplitudeM: 360, width: 85, sourceShare: 0.35 } as const;

export const RELIEF = {
  cell: 8,
  amplitude: 1.5,
  padHalf: 18,
  padBlend: 14,
  waves: [
    { x: 0.021, z: 0.013, weight: 0.6 },
    { x: -0.047, z: 0.031, weight: 0.3 },
    { x: 0.09, z: -0.07, weight: 0.12 },
  ],
} as const;

export const HOLE = { plugOverlap: 0.03 } as const;

export const ROCK = {
  tile: 14,
  textureSize: 512,
  columnStep: 2,
  contactHalf: 0.14,
  contactDash: 3.2,
  contactGap: 1.6,
  contactLift: 0.06,
} as const;

export const RULER = {
  x: -194,
  z: 0.6,
  width: 0.8,
  majorStepM: 500,
  minorStepM: 100,
  majorLength: 4.5,
  minorLength: 1.8,
  tickHeight: 0.35,
  labelGap: 1.4,
  labelScreenHeight: 0.017,
  labelCanvas: { width: 208, height: 72 },
} as const;

export const CRACKS = {
  count: 6,
  segments: 8,
  length: [3.5, 8] as const,
  width: 0.24,
  jitter: 1.1,
  branchShare: 0.4,
  lift: 0.07,
  seed: 11,
} as const;

export const PERFORATIONS = {
  stepM: 12,
  marginTopM: 15,
  marginBottomM: 25,
  tunnel: 3.6,
  tunnelWidth: 0.34,
  streakLength: [4, 8] as const,
  streakWidth: 0.42,
  streakEvery: 2,
  lift: 0.08,
  seed: 5,
} as const;

export const FLOW = {
  sizePerDistance: 0.008,
  minSize: 0.3,
  maxSize: 4.5,
  down: { count: 700, speed: 26 },
  up: { count: 1300, speed: 17, lightBoost: 1.8, heavyShare: 0.3 },
  plume: { share: 0.22, radius: 16, rise: 3.5 },
  bubbles: { count: 170, speed: 30, wobble: 0.35, size: 2.4 },
  loss: { count: 150, speed: 5 },
  oil: { count: 1100, speed: 24 },
  inflow: { count: 220, speed: 2.4, size: 1.4 },
  cuttingsEvery: 4,
  seed: 7,
} as const;

export const ANCHOR_LIFT = 0.5;
