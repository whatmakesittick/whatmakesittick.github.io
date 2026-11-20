import { SEGMENT_M } from '../../model/scale';
import type { KickId } from '../../ids';
import type { Key } from './curve';

type Triple = readonly [number, number, number];

export const ARM_PERIOD = 4;
export const RECOVERY_START = 3;
export const CATCH_AT = 1;

export const BODY = {
  upperArm: SEGMENT_M.upperArm,
  forearm: SEGMENT_M.forearm,
  hand: SEGMENT_M.hand,
  thigh: SEGMENT_M.thigh,
  shank: SEGMENT_M.shank,
  foot: SEGMENT_M.foot,
  shoulderHalf: SEGMENT_M.shoulderSpacing / 2,
  hipHalf: SEGMENT_M.hipSpacing / 2,
  hipX: -SEGMENT_M.trunk,
  hipY: -0.0408,
  neckBase: [0.0245, -0.0425, 0] as Triple,
  neckLength: 0.108,
  headFollow: 0.05,
  breathHeadDeg: -88,
  headUpNeckDeg: 38,
  hipBlend: { from: -0.47, to: -0.12 },
} as const;

export const HEEL_SHARE = 0.2;

export const BREATH_HEAD = { turnOut: [-0.35, 0.2], turnBack: [0.5, 0.92] } as const;

export const RECOVERY_PATH = { fadeIn: [3, 3.12], fadeOut: [3.86, 4] } as const;

export const REACH_SOFT = { knee: 0.95, span: 0.045 } as const;

export const ARM_KEYS = {
  entryElbow: [
    [0, 142],
    [0.35, 172],
    [0.86, 172],
    [1, 148],
  ] as readonly Key<number>[],
  recoveryElbow: [
    [3, 151],
    [3.22, 119],
    [3.5, 80],
    [3.78, 116],
    [4, 142],
  ] as readonly Key<number>[],
  recoveryHeight: [
    [3, -0.05],
    [3.2, 0.1],
    [3.5, 0.17],
    [3.76, 0.18],
    [3.9, 0.03],
    [4, -0.06],
  ] as readonly Key<number>[],
  reach: [
    [0, [0.67, 0, 0.03]],
    [0.5, [0.68, 0, 0.06]],
    [1, [0.6, 0, 0.07]],
    [1.5, [0.44, 0, 0.05]],
    [2, [0.35, 0, -0.2]],
    [2.1, [-0.3, 0, -0.25]],
    [2.2, [-0.4, 0, 0]],
    [2.4, [-0.3, 0, 0.03]],
    [2.75, [-0.52, 0, 0.04]],
    [3, [-0.65, 0, 0.06]],
    [3.22, [-0.6, 0, 0.165]],
    [3.5, [0.3, 0, 0.14]],
    [3.76, [0.76, 0, 0.07]],
  ] as readonly Key<Triple>[],
  pole: [
    [0, [0, 1, 0.3]],
    [0.5, [0, 1, 0.35]],
    [1, [-0.1, 1, 0.3]],
    [1.25, [-0.25, 1, 0.3]],
    [1.5, [-0.3, 1, 0.35]],
    [1.75, [0.2, 0.8, 0.5]],
    [2, [0.85, 0.2, 0.4]],
    [2.2, [0.3, 0.3, 0.85]],
    [2.4, [-0.15, 0.4, 0.9]],
    [2.75, [-0.1, 0.8, 0.6]],
    [3, [0, 1, 0.6]],
    [3.5, [0.2, 1, 0.3]],
    [3.9, [0.3, 1, 0.3]],
  ] as readonly Key<Triple>[],
  palm: [
    [0, [0.1, -1, 0.45]],
    [0.5, [0, -1, 0.2]],
    [1, [-0.6, -0.8, 0.1]],
    [1.5, [-1, -0.3, 0.05]],
    [2, [-1, 0, -0.15]],
    [2.4, [-1, 0.2, -0.2]],
    [2.75, [-0.7, 0.35, -0.7]],
    [3, [-0.25, 0.25, -1]],
    [3.22, [-0.3, 0.5, -0.8]],
    [3.5, [-0.8, 0.3, -0.5]],
    [3.62, [-0.5, -0.6, -0.5]],
    [3.76, [0.05, -1, -0.25]],
  ] as readonly Key<Triple>[],
  wristFlexDeg: [
    [0, 8],
    [0.5, 4],
    [0.85, 6],
    [1, 28],
    [1.5, 20],
    [2, 0],
    [2.4, -8],
    [2.75, -12],
    [3, -8],
    [3.22, 15],
    [3.36, 28],
    [3.5, 24],
    [3.62, -5],
    [3.7, -6],
    [3.8, 0],
  ] as readonly Key<number>[],
  recoveryUpperArm: [
    [3, [-0.33, 0.03, 0.07]],
    [3.1, [-0.31, 0.1, 0.12]],
    [3.22, [-0.23, 0.2, 0.17]],
    [3.36, [-0.1, 0.28, 0.19]],
    [3.5, [0.02, 0.32, 0.16]],
    [3.62, [0.12, 0.3, 0.15]],
    [3.7, [0.185, 0.25, 0.16]],
    [3.78, [0.245, 0.21, 0.13]],
    [3.86, [0.3, 0.16, 0.085]],
    [3.94, [0.32, 0.12, 0.075]],
  ] as readonly Key<Triple>[],
  recoveryForearm: [
    [3, [-0.26, -0.09, -0.01]],
    [3.1, [-0.94, -0.33, 0.08]],
    [3.22, [-0.85, -0.52, 0.08]],
    [3.36, [-0.45, -0.85, 0.22]],
    [3.44, [-0.3, -0.8, 0.38]],
    [3.5, [-0.08, -0.76, 0.5]],
    [3.56, [0.25, -0.72, 0.42]],
    [3.62, [0.55, -0.68, 0.26]],
    [3.7, [0.74, -0.58, 0.05]],
    [3.78, [0.9, -0.4, -0.18]],
    [3.86, [0.95, -0.3, -0.1]],
    [3.94, [0.28, -0.11, -0.005]],
  ] as readonly Key<Triple>[],
  narrowing: [
    [0, 0.02],
    [0.5, 0.035],
    [1, 0.02],
    [1.5, 0],
    [3.6, 0],
  ] as readonly Key<number>[],
  protraction: [
    [0, 0.075],
    [0.5, 0.11],
    [1, 0.06],
    [1.5, 0.015],
    [2, -0.005],
    [2.5, -0.02],
    [3, -0.025],
    [3.5, 0],
    [3.76, 0.04],
  ] as readonly Key<number>[],
  elevation: [
    [0, 0.015],
    [0.5, 0.02],
    [1, 0.015],
    [1.5, 0.01],
    [2, 0],
    [2.5, -0.01],
    [3, 0.005],
    [3.3, 0.04],
    [3.55, 0.075],
    [3.8, 0.04],
  ] as readonly Key<number>[],
} as const;

export interface KickShape {
  readonly thigh: readonly Key<number>[];
  readonly knee: readonly Key<number>[];
  readonly ankleDeg: readonly Key<number>[];
  readonly heave: readonly Key<number>[];
  readonly restDeg: number;
  readonly thighDeg: number;
  readonly kneeDeg: number;
}

export const KICK_SHAPES: Readonly<Record<KickId, KickShape>> = {
  six: {
    thigh: [
      [0, 1],
      [0.15, 0.6],
      [0.35, -0.35],
      [0.55, -1],
      [0.75, -0.2],
      [0.9, 0.75],
    ],
    knee: [
      [0, 0.5],
      [0.1, 0.1],
      [0.2, 0.02],
      [0.5, 0.02],
      [0.62, 0.15],
      [0.75, 0.6],
      [0.86, 1],
      [0.94, 0.9],
    ],
    ankleDeg: [
      [0, -2],
      [0.15, 4],
      [0.35, 18],
      [0.55, 24],
      [0.72, 18],
      [0.82, 11],
      [0.91, 3],
    ],
    heave: [
      [0, 0.7],
      [0.1, 1],
      [0.3, 0.2],
      [0.6, -0.5],
      [0.85, -0.1],
    ],
    restDeg: 7,
    thighDeg: 9,
    kneeDeg: 34,
  },
  two: {
    thigh: [
      [0, 1],
      [0.12, 0.55],
      [0.3, -0.1],
      [0.5, -0.35],
      [0.65, -0.5],
      [0.77, -0.55],
      [0.87, 0.15],
      [0.95, 0.8],
    ],
    knee: [
      [0, 0.45],
      [0.08, 0.08],
      [0.2, 0.02],
      [0.6, 0.04],
      [0.72, 0.2],
      [0.82, 0.7],
      [0.9, 1],
      [0.96, 0.85],
    ],
    ankleDeg: [
      [0, -2],
      [0.12, 4],
      [0.3, 16],
      [0.6, 20],
      [0.78, 16],
      [0.86, 9],
      [0.93, 2],
    ],
    heave: [
      [0, 0.8],
      [0.08, 1],
      [0.25, 0.1],
      [0.5, 0],
      [0.8, -0.1],
    ],
    restDeg: 6,
    thighDeg: 8.5,
    kneeDeg: 30,
  },
};

export const KICK = {
  depthM: 0.35,
  strongBeatShare: 0.12,
  headUpGain: 0.35,
  headUpKneeGain: 0.15,
  adduction: 0.04,
  toeIn: 0.12,
  hipHeaveM: 0.01,
} as const;
