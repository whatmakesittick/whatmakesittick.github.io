import type { PlanPoint, PumpId, Span } from '../model/scale';

export interface Detail {
  readonly radial: number;
  readonly lathe: number;
  readonly profile: number;
  readonly tube: number;
  readonly cap: number;
  readonly sphere: number;
  readonly arc: number;
}

export const DETAIL = {
  hero: { radial: 12, lathe: 24, profile: 28, tube: 72, cap: 4, sphere: 14, arc: 24 },
  row: { radial: 6, lathe: 10, profile: 10, tube: 18, cap: 2, sphere: 6, arc: 10 },
} as const satisfies Record<string, Detail>;

export type ProfilePoint = readonly [heightShare: number, radiusShare: number];

export const BLADE = {
  outerHelixRadius: 0.5,
  innerHelixRadius: 0.42,
  innerHelixInset: 0.25,
  carboxylRadius: 0.26,
  carboxylDepth: 0.12,
} as const;

export const AXLE_FORM = {
  footProfile: [
    [0, 0],
    [0.03, 0.62],
    [0.18, 0.96],
    [0.5, 1],
    [0.8, 0.86],
    [0.96, 0.52],
    [1, 0],
  ] as readonly ProfilePoint[],
  footLumps: [
    { azimuthDeg: 150, radiusShare: 0.78, heightShare: 0.55, size: 0.85 },
    { azimuthDeg: 290, radiusShare: 0.72, heightShare: 0.42, size: 0.7 },
  ],
  bulgeShares: [0, 0.35, 1, 0.75, 0],
  coil: { strandRadius: 0.5, windRadius: 0.32, turns: 1.4 },
} as const;

export const LOBE = {
  profile: [
    [0, 0],
    [0.035, 0.48],
    [0.13, 0.77],
    [0.31, 0.9],
    [0.5, 1],
    [0.7, 0.96],
    [0.86, 0.79],
    [0.955, 0.5],
    [1, 0],
  ] as readonly ProfilePoint[],
  endBend: 1.1,
  tangentialSquash: 0.9,
} as const;

export const OSCP_FORM = {
  profile: [
    [0, 0],
    [0.12, 0.8],
    [0.45, 1],
    [0.8, 0.82],
    [1, 0],
  ] as readonly ProfilePoint[],
  sink: 0.5,
} as const;

export const GATE_FORM = {
  arcHalfDeg: 24,
  bevel: 0.45,
  bevelSegments: 3,
  creaseDeg: 40,
} as const;

export const CHANNEL_FORM = {
  profile: [
    [0, 0.36],
    [0.45, 0.42],
    [0.8, 0.66],
    [1, 1],
  ] as readonly ProfilePoint[],
  mouthRadius: 0.9,
  ringGap: 0.6,
  reach: 0.75,
} as const;

export interface StalkPoint {
  readonly radius: number;
  readonly y: number;
}

export const STALK_FORM = {
  path: [
    { radius: 6.2, y: -2.2 },
    { radius: 6.2, y: 3 },
    { radius: 6.3, y: 9 },
    { radius: 6.15, y: 14.5 },
    { radius: 5.3, y: 18.4 },
    { radius: 3.6, y: 19.5 },
    { radius: 1.3, y: 19.3 },
  ] as readonly StalkPoint[],
  footReleaseY: 7,
  coil: { strandRadius: 0.4, windRadius: 0.24, turns: 2.5 },
  foot: { radius: 0.95, span: [-2.2, 1.9] as Span },
} as const;

export const MEMBRANE_FORM = {
  opacity: 0.74,
  faceTileNm: 6.8,
  faceHeadsPerTile: 8,
  edgeHeadsPerTile: 5,
  textureSize: 128,
  headRadiusShare: 0.5,
  headRadiusVariation: 0.1,
  headJitterShare: 0.16,
  tailOffsetNm: 0.14,
  tailWidthNm: 0.07,
  tailWaveNm: 0.07,
  tailWaveLengthNm: 0.55,
  tailGapNm: 0.12,
  normalStrength: 1.3,
  seed: 20260928,
} as const;

export const MOLECULE_PATH = {
  adpEntry: { azimuthOffsetDeg: -14, radius: 9.5, y: 17 },
  phosphateEntry: { azimuthOffsetDeg: 24, radius: 9, y: 14.5 },
  phosphateDock: { azimuthOffsetDeg: 16, radius: 2.9, y: 12.4 },
  atpExit: { azimuthOffsetDeg: -26, radius: 10.5, y: 18.5 },
  appearShare: 0.12,
  phosphateDelay: 0.08,
  fadeShare: 0.2,
  mergeShrink: 0.4,
  flashWidth: 0.12,
  tumble: Math.PI,
} as const;

export const PROTON_FORM = {
  radius: 0.36,
  lift: 0.42,
  riseShare: 0.8,
  dropShare: 0.2,
  appearShare: 0.15,
  driftDeg: 70,
  driftTurnDeg: 12,
  driftOutward: 2.5,
  driftRise: 4.5,
  fadeFrom: 0.4,
  haloSize: 8,
  haloAlpha: 0.5,
} as const;

export interface CrowdForm {
  readonly count: number;
  readonly y: Span;
}

export const CROWD = {
  x: [-48, 12] as Span,
  z: [-14, 5] as Span,
  below: { count: 110, y: [-8.5, -3] as Span },
  above: { count: 22, y: [3, 9.5] as Span },
  motorClearance: 7.5,
  pumpClearance: 1.2,
  drift: { x: 0.9, y: 0.5, z: 0.9 },
  driftRadPerDeg: 1 / 60,
  seed: 11,
} as const;

export interface PumpLane {
  readonly top: PlanPoint;
  readonly bottom: PlanPoint;
  readonly out: PlanPoint;
}

export const PUMP_LANES: Readonly<Record<PumpId, PumpLane>> = {
  complexOne: {
    top: { x: -40, y: 3.6, z: 3.55 },
    bottom: { x: -40, y: -3.6, z: 3.55 },
    out: { x: -38.8, y: -6.5, z: 5 },
  },
  complexThree: {
    top: { x: -28.8, y: 3.6, z: 3.85 },
    bottom: { x: -28.8, y: -3.6, z: 3.85 },
    out: { x: -27.6, y: -6.5, z: 5.3 },
  },
  complexFour: {
    top: { x: -18.8, y: 3.6, z: 3.35 },
    bottom: { x: -18.8, y: -3.6, z: 3.35 },
    out: { x: -17.6, y: -6.5, z: 4.8 },
  },
};

export const PUMPED_FLOW = {
  travelDeg: 150,
  descendShare: 0.6,
  appearShare: 0.1,
  fadeFrom: 0.7,
} as const;

export const ELECTRON_FORM = {
  radius: 0.34,
  haloSize: 8,
  haloAlpha: 0.45,
  stops: [
    { x: -37.1, y: 9, z: 2.3 },
    { x: -37.6, y: 4.2, z: 2.2 },
    { x: -33.8, y: 2.7, z: 2.6 },
    { x: -28.4, y: 3, z: 3.3 },
    { x: -23.2, y: -3, z: 2.6 },
    { x: -18.9, y: 2.9, z: 2.9 },
    { x: -18.5, y: 4.3, z: 1.4 },
  ] as readonly PlanPoint[],
  travelLaps: 1.5,
  hopFrom: 0.55,
  edgeShare: 0.04,
} as const;

export const OXYGEN_FORM = {
  atomRadius: 0.62,
  hydrogenRadius: 0.38,
  bondHalf: 0.52,
  hydrogen: { x: 0.52, y: 0.4 },
  entry: { x: -14, y: 10, z: 5 },
  dock: { x: -18.5, y: 5, z: 1.2 },
  exits: [
    { x: -15, y: 9, z: 4.5 },
    { x: -22, y: 8.5, z: 4.2 },
  ] as readonly PlanPoint[],
  travelLaps: 1,
  arriveEnd: 0.45,
  splitAt: 0.6,
  fadeFrom: 0.8,
  appearShare: 0.1,
  tumble: Math.PI,
} as const;

export const GLYPH_FORM = {
  base: { radius: 0.55 },
  sugar: { radius: 0.42, x: 0.6, y: -0.15 },
  phosphate: { radius: 0.3, firstX: 1.1, spacing: 0.56, y: -0.15 },
  flashSize: 14,
  flashAlpha: 0.9,
} as const;

export const SEAT_FORM = {
  radius: 0.8,
  tube: 0.15,
  drop: 0.5,
  tubeSegments: 8,
  ringSegments: 24,
} as const;

export interface Lump extends PlanPoint {
  readonly radius: number;
}

export const PUMP_FORM = {
  profile: [
    [0, 0],
    [0.06, 0.72],
    [0.25, 0.95],
    [0.5, 1],
    [0.75, 0.9],
    [0.93, 0.6],
    [1, 0],
  ] as readonly ProfilePoint[],
  depthSquash: 0.86,
  membraneArm: { radius: 3.2, y: -0.3 },
  matrixArm: {
    from: { x: -38.2, y: 2.2, z: 0.3 },
    to: { x: -37.2, y: 9.2, z: 0.8 },
    radius: 1.8,
  },
  lumps: {
    complexOne: [
      { x: -43, y: 2.2, z: 1.2, radius: 1.3 },
      { x: -36.8, y: 10.2, z: -0.6, radius: 1.1 },
      { x: -40.5, y: -2.4, z: -1.4, radius: 1.2 },
    ],
    complexThree: [
      { x: -29.3, y: 4.6, z: 0.4, radius: 1.5 },
      { x: -26.7, y: 4.4, z: -0.5, radius: 1.4 },
    ],
    complexFour: [{ x: -17.6, y: 3.6, z: 0.6, radius: 1.1 }],
  } as Readonly<Record<PumpId, readonly Lump[]>>,
  label: { x: -28, y: 2.8, z: 3.2 },
  centre: { x: -28, y: 0.75, z: 0 },
} as const;

export const SPEED_BLUR = {
  thresholdDegPerSecond: 720,
  easeSeconds: 0.25,
  settled: 0.01,
  hideDetailAt: 0.5,
  sleeveOpacity: 0.75,
  bandOpacity: 0.85,
  protonBandOpacity: 0.75,
  sleeveGrow: 0.04,
  carboxylTube: 0.16,
  protonTube: 0.3,
  tubeSegments: 6,
  segments: 48,
} as const;

export const ROW_FORM = {
  maxNeighbours: 9,
  offsetDeg: 37,
  labelDeg: 330,
  labelSink: 0.2,
} as const;
