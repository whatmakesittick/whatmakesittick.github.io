import { HAND_WIDTH_M, SEGMENT_M } from '../../../model/scale';
import type { Station } from './tube';

const HALF_TURN = Math.PI;
const QUARTER_TURN = Math.PI / 2;

export const LIMB_SEGMENTS = { radial: 18, rings: 12, capSteps: 4 } as const;

function scaled(length: number, stations: readonly Station[]): readonly Station[] {
  return stations.map(([at, width, positive, negative]) => [
    at * length,
    width,
    positive,
    negative,
  ]);
}

export const LIMBS = {
  upperArm: {
    length: SEGMENT_M.upperArm,
    capStart: 0.04,
    capEnd: 0.03,
    stations: scaled(SEGMENT_M.upperArm, [
      [0, 0.05, 0.05, 0.05],
      [0.3, 0.052, 0.055, 0.056],
      [0.62, 0.046, 0.05, 0.05],
      [1, 0.038, 0.039, 0.04],
    ]),
  },
  forearm: {
    length: SEGMENT_M.forearm,
    capStart: 0.03,
    capEnd: 0.012,
    stations: scaled(SEGMENT_M.forearm, [
      [0, 0.04, 0.041, 0.04],
      [0.2, 0.045, 0.043, 0.041],
      [0.55, 0.036, 0.032, 0.03],
      [1, 0.028, 0.018, 0.018],
    ]),
  },
  thigh: {
    length: SEGMENT_M.thigh,
    capStart: 0.06,
    capEnd: 0.03,
    stations: scaled(SEGMENT_M.thigh, [
      [0, 0.088, 0.086, 0.088],
      [0.28, 0.085, 0.078, 0.095],
      [0.65, 0.068, 0.064, 0.072],
      [1, 0.054, 0.054, 0.054],
    ]),
  },
  shank: {
    length: SEGMENT_M.shank,
    capStart: 0.03,
    capEnd: 0.02,
    stations: scaled(SEGMENT_M.shank, [
      [0, 0.054, 0.054, 0.052],
      [0.24, 0.056, 0.068, 0.05],
      [0.55, 0.045, 0.054, 0.04],
      [0.88, 0.031, 0.034, 0.03],
      [1, 0.029, 0.03, 0.029],
    ]),
  },
  neck: {
    length: 0.1,
    capStart: 0.02,
    capEnd: 0.02,
    stations: [
      [0, 0.066, 0.082, 0.082],
      [0.045, 0.058, 0.066, 0.066],
      [0.1, 0.052, 0.054, 0.054],
    ] as readonly Station[],
  },
} as const;

export type LimbId = keyof typeof LIMBS;

export const SLEEVE = { share: 0.42, inflate: 0.0025, lip: 0.006 } as const;

export const JOINTS = {
  elbow: [0.04, 0.041, 0.04] as const,
  knee: [0.056, 0.058, 0.054] as const,
} as const;

export const DELTOID = {
  radii: [0.057, 0.098, 0.06] as const,
  centre: [0, 0.05, 0.004] as const,
  segments: { width: 20, height: 14 },
} as const;

const FINGER_RADIUS = 0.0092;
const FINGER_SPACING = FINGER_RADIUS * 1.93;
const HAND_END = SEGMENT_M.hand;

export const HAND = {
  length: SEGMENT_M.hand,
  width: HAND_WIDTH_M,
  radial: 14,
  palm: {
    rings: 8,
    capStart: 0.012,
    capEnd: 0.008,
    stations: [
      [-0.015, 0.027, 0.019, 0.017],
      [0, 0.029, 0.0195, 0.017],
      [0.035, 0.036, 0.0155, 0.012],
      [0.08, 0.0385, 0.0128, 0.0105],
      [0.112, 0.0365, 0.0108, 0.0098],
    ] as readonly Station[],
  },
  finger: {
    base: 0.104,
    radius: FINGER_RADIUS,
    spacing: FINGER_SPACING,
    lengths: [0.097, 0.103, 0.098, 0.082].map((length) => Math.min(length, HAND_END - 0.1)),
    curlRad: 0.1,
    radial: 10,
    rings: 4,
  },
  thumb: {
    radius: 0.0108,
    length: 0.06,
    base: [0.031, 0.026, 0.007] as const,
    splayRad: 0.32,
    cupRad: 0.35,
  },
  band: {
    stations: [
      [-0.014, 0.0305, 0.0235, 0.0225],
      [0.012, 0.0305, 0.0235, 0.0225],
    ] as readonly Station[],
    capStart: 0.003,
    capEnd: 0.003,
  },
} as const;

export const FOOT = {
  length: SEGMENT_M.foot,
  radial: 14,
  rings: 10,
  capStart: 0.028,
  capEnd: 0.012,
  stations: [
    [-0.03, 0.03, 0.03, 0.034],
    [0, 0.036, 0.042, 0.034],
    [0.06, 0.037, 0.028, 0.016],
    [0.12, 0.044, 0.02, 0.016],
    [0.17, 0.047, 0.017, 0.017],
    [0.195, 0.04, 0.0135, 0.013],
  ] as readonly Station[],
  toes: {
    base: 0.178,
    lengths: [0.052, 0.046, 0.04, 0.034, 0.028],
    radii: [0.0112, 0.0088, 0.0079, 0.0072, 0.0067],
    spread: [0.032, 0.0165, 0.0035, -0.009, -0.0205],
    radial: 8,
    splay: 0.04,
  },
  ankleBone: { radii: [0.012, 0.013, 0.012] as const, x: 0.036, y: 0.002, z: -0.004 },
} as const;

export const HEAD = {
  skull: { centre: [0.165, 0.004, 0] as const, radii: [0.118, 0.106, 0.093] as const },
  jaw: { centre: [0.1, -0.052, 0] as const, radii: [0.07, 0.058, 0.066] as const },
  chin: { centre: [0.066, -0.082, 0] as const, radii: [0.028, 0.024, 0.03] as const },
  nose: { centre: [0.118, -0.108, 0] as const, radii: [0.018, 0.014, 0.011] as const },
  ear: { centre: [0.14, -0.012, 0.089] as const, radii: [0.02, 0.026, 0.008] as const },
  cap: { scale: 1.075, coverRad: Math.PI * 0.6, tilt: 0.42, rim: 0.03 },
  stripe: { scale: 1.012, half: 0.14, from: 0.4 },
  band: { tube: 0.011, scale: 1.045, tiltRad: -0.36, along: 0.15 },
  rim: { radii: [0.031, 0.017, 0.037] as const, x: 0.152, y: -0.097, z: 0.041, toe: 0.32 },
  lens: { radii: [0.026, 0.0145, 0.032] as const, x: 0.152, y: -0.1, z: 0.041, toe: 0.32 },
  bridge: { radius: 0.004, length: 0.02, centre: [0.152, -0.104, 0] as const },
  anchor: [0.29, 0.03, 0.05] as const,
  segments: { width: 28, height: 20 },
} as const;

export interface TorsoDetail {
  readonly x: number;
  readonly spreadX: number;
  readonly angle: number;
  readonly spreadAngle: number;
  readonly amount: number;
  readonly paired: boolean;
}

const BACK = QUARTER_TURN;
const FRONT = -QUARTER_TURN;

function detail(
  x: number,
  spreadX: number,
  angle: number,
  spreadAngle: number,
  amount: number,
  paired = true,
): TorsoDetail {
  return { x, spreadX, angle, spreadAngle, amount, paired };
}

export const TORSO = {
  stations: [
    [-0.668, 0.02, 0.018, 0],
    [-0.655, 0.1, 0.075, 0],
    [-0.625, 0.148, 0.1, 0],
    [-0.565, 0.173, 0.098, 0],
    [-0.5, 0.179, 0.096, 0],
    [-0.43, 0.163, 0.09, 0.003],
    [-0.36, 0.146, 0.084, 0.006],
    [-0.28, 0.152, 0.09, 0.008],
    [-0.2, 0.168, 0.096, 0.008],
    [-0.12, 0.182, 0.1, 0.006],
    [-0.05, 0.192, 0.1, 0.004],
    [0, 0.19, 0.095, 0.006],
    [0.04, 0.17, 0.085, 0.008],
    [0.075, 0.122, 0.07, 0.01],
    [0.1, 0.07, 0.062, 0.01],
    [0.112, 0.03, 0.03, 0.01],
  ] as readonly (readonly [number, number, number, number])[],
  details: [
    detail(-0.3, 0.3, BACK, 0.17, -0.05, false),
    detail(-0.3, 0.3, BACK - 0.4, 0.17, 0.032),
    detail(-0.04, 0.085, BACK - 0.58, 0.28, 0.065),
    detail(0.075, 0.05, BACK - 0.5, 0.4, 0.06),
    detail(-0.565, 0.065, BACK - 0.5, 0.36, 0.07),
    detail(-0.585, 0.055, BACK, 0.12, -0.04, false),
    detail(-0.04, 0.075, FRONT + 0.5, 0.32, 0.06),
    detail(-0.05, 0.08, FRONT, 0.1, -0.02, false),
    detail(-0.19, 0.1, 0, 0.5, 0.035),
    detail(-0.3, 0.12, FRONT + 0.26, 0.13, 0.014),
  ] as readonly TorsoDetail[],
  rings: 56,
  segments: 56,
  squareness: 2.6,
  pelvisEnd: -0.4,
  chestStart: -0.3,
  mirror: HALF_TURN,
} as const;
