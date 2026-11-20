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
  headFollow: 0.2,
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
    [3.22, 98],
    [3.5, 48],
    [3.78, 118],
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
    [1.5, [0.46, 0, 0.26]],
    [2, [0.05, 0, 0.24]],
    [2.4, [-0.2, 0, 0.22]],
    [2.75, [-0.55, 0, 0.19]],
    [3, [-0.68, 0, 0.2]],
    [3.22, [-0.7, 0, 0.7]],
    [3.5, [0.09, 0, 1]],
    [3.76, [0.77, 0, 0.64]],
  ] as readonly Key<Triple>[],
  pole: [
    [0, [0, 1, 0.35]],
    [0.5, [0, 1, 0.5]],
    [1, [-0.2, 0.6, 1]],
    [1.5, [-0.3, 0.3, 0.9]],
    [2, [-0.4, 0.1, 0.85]],
    [2.4, [-0.3, 0.3, 0.85]],
    [2.75, [-0.15, 0.7, 0.8]],
    [3, [0, 1, 0.6]],
    [3.22, [0, 1, 0.55]],
    [3.5, [-0.25, 1, 0.6]],
    [3.76, [0, 1, 0.4]],
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
    [3.22, [0, 0.3, -1]],
    [3.5, [0.15, -0.3, -1]],
    [3.76, [0.05, -1, -0.25]],
  ] as readonly Key<Triple>[],
  wristFlexDeg: [
    [0, 18],
    [0.5, 14],
    [1, 26],
    [1.5, 14],
    [2, 0],
    [2.4, -8],
    [2.75, -12],
    [3, -8],
    [3.22, 8],
    [3.5, 12],
    [3.76, 26],
  ] as readonly Key<number>[],
  protraction: [
    [0, 0.05],
    [0.5, 0.065],
    [1, 0.04],
    [1.5, 0.015],
    [2, -0.005],
    [2.5, -0.02],
    [3, -0.025],
    [3.5, 0],
    [3.76, 0.04],
  ] as readonly Key<number>[],
  elevation: [
    [0, 0.04],
    [0.5, 0.055],
    [1, 0.03],
    [1.5, 0.01],
    [2, 0],
    [2.5, -0.01],
    [3, 0.005],
    [3.4, 0.03],
    [3.76, 0.05],
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
