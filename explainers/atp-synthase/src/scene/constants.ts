import type { Span } from '../model/scale';

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
  arcHalfDeg: 32,
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
  headRadiusShare: 0.47,
  headJitterShare: 0.12,
  tailOffsetNm: 0.14,
  tailWidthNm: 0.07,
  tailWaveNm: 0.07,
  tailWaveLengthNm: 0.55,
  tailGapNm: 0.12,
  normalStrength: 2.4,
  seed: 20260928,
} as const;
