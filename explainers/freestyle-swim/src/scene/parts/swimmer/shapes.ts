import { HAND_WIDTH_M, SEGMENT_M } from '../../../model/scale';

type Station = readonly [x: number, halfWidth: number, halfThickness: number, lift: number];

export const LIMB_SEGMENTS = { radial: 16, caps: 5, body: 9 } as const;

export const LIMBS = {
  upperArm: { length: SEGMENT_M.upperArm, radii: [0.05, 0.052, 0.039], bulgeAt: 0.35 },
  forearm: { length: SEGMENT_M.forearm, radii: [0.042, 0.043, 0.027], bulgeAt: 0.22 },
  thigh: { length: SEGMENT_M.thigh, radii: [0.088, 0.078, 0.054], bulgeAt: 0.3 },
  shank: { length: SEGMENT_M.shank, radii: [0.054, 0.058, 0.034], bulgeAt: 0.28 },
  sleeve: { length: SEGMENT_M.thigh * 0.42, radii: [0.093, 0.09, 0.085], bulgeAt: 0.5 },
  neck: { length: 0.1, radii: [0.06, 0.054, 0.05], bulgeAt: 0.5 },
} as const;

export type LimbId = keyof typeof LIMBS;

export const JOINTS = { shoulder: 0.064, elbow: 0.041, knee: 0.057 } as const;

export const HAND = {
  length: SEGMENT_M.hand,
  width: HAND_WIDTH_M,
  thickness: 0.024,
  radius: 0.011,
  taper: 0.24,
  tipThinning: 0.4,
  thumb: { radius: 0.0115, length: 0.045, base: 0.03, splayRad: 0.45, palmward: 0.006 },
} as const;

export const FOOT = {
  profile: [
    [0, 0.018],
    [0.04, 0.042],
    [0.1, 0.048],
    [0.17, 0.05],
    [0.23, 0.047],
    [0.27, 0.032],
    [0.286, 0],
  ] as readonly (readonly [number, number])[],
  heelShare: 0.2,
  flatten: 0.58,
  segments: 14,
} as const;

export const HEAD = {
  skull: { centre: [0.165, 0.004, 0] as const, radii: [0.118, 0.106, 0.093] as const },
  jaw: { centre: [0.105, -0.055, 0] as const, radii: [0.07, 0.058, 0.068] as const },
  cap: { scale: 1.075, coverRad: Math.PI * 0.6, tilt: 0.42 },
  band: { tube: 0.011, scale: 1.045, tiltRad: -0.36, along: 0.15 },
  lens: { radii: [0.024, 0.011, 0.03] as const, x: 0.152, y: -0.098, z: 0.036, toe: 0.32 },
  anchor: [0.29, 0.03, 0.05] as const,
  segments: { width: 28, height: 20 },
} as const;

export const TORSO = {
  stations: [
    [-0.668, 0.02, 0.018, 0],
    [-0.655, 0.1, 0.075, 0],
    [-0.625, 0.148, 0.1, 0],
    [-0.565, 0.173, 0.108, 0],
    [-0.5, 0.179, 0.108, 0],
    [-0.43, 0.165, 0.101, 0.003],
    [-0.36, 0.151, 0.098, 0.006],
    [-0.28, 0.157, 0.108, 0.008],
    [-0.2, 0.169, 0.118, 0.008],
    [-0.12, 0.181, 0.125, 0.006],
    [-0.05, 0.193, 0.122, 0.004],
    [0, 0.192, 0.114, 0.006],
    [0.04, 0.174, 0.1, 0.008],
    [0.075, 0.128, 0.082, 0.01],
    [0.1, 0.07, 0.06, 0.01],
    [0.112, 0.03, 0.03, 0.01],
  ] as readonly Station[],
  rings: 40,
  segments: 30,
  squareness: 2.7,
  pelvisEnd: -0.4,
  chestStart: -0.3,
} as const;
