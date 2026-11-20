import { SEGMENT_M } from '../../model/scale';
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
  hipHalf: 0.092,
  hipX: -SEGMENT_M.trunk,
  hipY: -0.012,
  neckBase: [0.07, 0.01, 0] as Triple,
  neckLength: 0.1,
  headFollow: 0.35,
  breathHeadDeg: -96,
  headUpNeckDeg: 38,
  hipBlend: { from: -0.47, to: -0.12 },
} as const;

export const HEEL_SHARE = 0.2;

export const REACH_SOFT = { knee: 0.82, span: 0.15 } as const;

export const ARM_KEYS = {
  entryElbow: [
    [0, 150],
    [0.45, 166],
    [1, 148],
  ] as readonly Key<number>[],
  recoveryElbow: [
    [3, 151],
    [3.22, 106],
    [3.5, 80],
    [3.78, 124],
    [4, 150],
  ] as readonly Key<number>[],
  recoveryHeight: [
    [3, -0.05],
    [3.2, 0.1],
    [3.5, 0.17],
    [3.76, 0.18],
    [3.9, 0],
    [4, -0.21],
  ] as readonly Key<number>[],
  reach: [
    [0, [0.72, 0, 0.23]],
    [0.5, [0.74, 0, 0.24]],
    [1, [0.64, 0, 0.29]],
    [1.5, [0.46, 0, 0.31]],
    [2, [0.05, 0, 0.27]],
    [2.5, [-0.5, 0, 0.18]],
    [3, [-0.68, 0, 0.2]],
    [3.22, [-0.48, 0, 0.36]],
    [3.5, [0.08, 0, 0.5]],
    [3.76, [0.5, 0, 0.36]],
  ] as readonly Key<Triple>[],
  pole: [
    [0, [0, 1, 0.35]],
    [0.5, [0, 1, 0.5]],
    [1, [-0.2, 0.6, 1]],
    [1.5, [-0.3, 0.3, 1]],
    [2, [-0.4, 0.1, 1]],
    [2.5, [-0.25, 0.5, 0.9]],
    [3, [0, 1, 0.6]],
    [3.22, [0, 1, 0.45]],
    [3.5, [-0.25, 1, 0.25]],
    [3.76, [0, 1, 0.2]],
  ] as readonly Key<Triple>[],
  palm: [
    [0, [0.1, -1, 0.45]],
    [0.5, [0, -1, 0.2]],
    [1, [-0.6, -0.8, 0.1]],
    [1.5, [-1, -0.3, 0.05]],
    [2, [-1, 0, -0.15]],
    [2.5, [-1, 0.4, -0.25]],
    [3, [-0.25, 0.25, -1]],
    [3.22, [0, 0.3, -1]],
    [3.5, [0.15, -0.3, -1]],
    [3.76, [0.05, -1, -0.25]],
  ] as readonly Key<Triple>[],
  wristFlexDeg: [
    [0, 18],
    [0.5, 4],
    [1, 14],
    [1.5, 10],
    [2, 0],
    [2.5, -12],
    [3, -6],
    [3.22, 16],
    [3.5, 22],
    [3.76, 26],
  ] as readonly Key<number>[],
  protraction: [
    [0, 0.03],
    [0.5, 0.045],
    [1, 0.03],
    [2, 0],
    [3, -0.02],
    [3.5, 0],
  ] as readonly Key<number>[],
} as const;

export const KICK = {
  restDeg: 6,
  thighPerDepthDeg: 20,
  thighLead: 0.05,
  kneeDeg: { two: 30, six: 22 },
  kneePeak: 0.93,
  kneeWindow: 0.3,
  ankleRestDeg: 16,
  ankleSwingDeg: 12,
  toeIn: 0.12,
} as const;
