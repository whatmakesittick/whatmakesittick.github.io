import type { Quaternion, Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { GaitReading, PaceId, SideId } from '../../ids';
import { GAIT_DATA } from '../../model/gaitData';
import { evaluateFit } from '../../model/legAngles';
import { CYCLE_UNITS } from '../../model/timeMap';
import { RIG_BODY } from './body';
import { Z_AXIS, about, apply, fromEuler, sideSign } from './frames';
import type { TrunkState } from './pelvis';

export interface ArmChain {
  readonly shoulder: Vector3;
  readonly elbow: Vector3;
  readonly wrist: Vector3;
  readonly upper: Quaternion;
  readonly forearm: Quaternion;
  readonly handAxis: Vector3;
  readonly palm: Vector3;
  readonly handShape: Readonly<Record<string, number>>;
}

export const ARM_STYLE = {
  abductionDeg: { back: 11, front: 12, passing: 5 },
  innerRotationDeg: { back: 6, front: 36 },
  protractionM: 0.012,
  pronationDeg: 18,
  wristFlexDeg: 8,
  held: { flexDeg: 39, crossDeg: 3, abductionDeg: -8, innerRotationDeg: 74 },
} as const;

export const LOOSE_FIST: Readonly<Record<string, number>> = {
  index1_rz: 1.0,
  index2_rz: 1.2,
  index3_rz: 0.5,
  middle1_rz: 1.05,
  middle2_rz: 1.25,
  middle3_rz: 0.55,
  ring1_rz: 1.1,
  ring2_rz: 1.25,
  ring3_rz: 0.55,
  pinky1_rz: 1.15,
  pinky2_rz: 1.2,
  pinky3_rz: 0.5,
  thumb0_ry: -0.6,
  thumb1_rz: 0.45,
  thumb2_rz: 0.7,
};

export const RESTING_HAND: Readonly<Record<string, number>> = {
  index1_rz: 0.3,
  index2_rz: 0.35,
  index3_rz: 0.2,
  middle1_rz: 0.35,
  middle2_rz: 0.4,
  middle3_rz: 0.2,
  ring1_rz: 0.4,
  ring2_rz: 0.45,
  ring3_rz: 0.25,
  pinky1_rz: 0.45,
  pinky2_rz: 0.5,
  pinky3_rz: 0.25,
  thumb0_ry: 0,
  thumb1_rz: 0.15,
  thumb2_rz: 0.2,
};

const SHARE_SAMPLES = 200;
const FRONT_EASE_POWER = 3;

interface HipRange {
  readonly mean: number;
  readonly half: number;
}

function hipRangeOf(pace: PaceId): HipRange {
  const values = Array.from({ length: SHARE_SAMPLES }, (_, index) =>
    evaluateFit(GAIT_DATA[pace].angles.hipFlex, (index * CYCLE_UNITS) / SHARE_SAMPLES),
  );
  const low = Math.min(...values);
  const high = Math.max(...values);
  return { mean: (low + high) / 2, half: (high - low) / 2 };
}

const HIP_RANGES: Readonly<Record<PaceId, HipRange>> = {
  easy: hipRangeOf('easy'),
  steady: hipRangeOf('steady'),
  fast: hipRangeOf('fast'),
};

function swingShare(reading: GaitReading, side: SideId): number {
  const oppositeUnits =
    side === 'right' ? (reading.units + CYCLE_UNITS / 2) % CYCLE_UNITS : reading.units;
  const { mean, half } = HIP_RANGES[reading.pace];
  const share = (evaluateFit(GAIT_DATA[reading.pace].angles.hipFlex, oppositeUnits) - mean) / half;
  return Math.max(-1, Math.min(1, share));
}

function between(back: number, front: number, share: number): number {
  return back + ((front - back) * (share + 1)) / 2;
}

function towardFront(back: number, front: number, share: number): number {
  return back + (front - back) * ((share + 1) / 2) ** FRONT_EASE_POWER;
}

interface ArmAngles {
  readonly flexDeg: number;
  readonly abductionDeg: number;
  readonly innerRotationDeg: number;
  readonly elbowDeg: number;
  readonly protraction: number;
}

function swingingAngles(reading: GaitReading, side: SideId): ArmAngles {
  const flexDeg = reading.upper.shoulderFlexDeg[side];
  const share = swingShare(reading, side);
  return {
    flexDeg,
    abductionDeg:
      between(ARM_STYLE.abductionDeg.back, ARM_STYLE.abductionDeg.front, share) +
      ARM_STYLE.abductionDeg.passing * (1 - share * share),
    innerRotationDeg: towardFront(
      ARM_STYLE.innerRotationDeg.back,
      ARM_STYLE.innerRotationDeg.front,
      share,
    ),
    elbowDeg: reading.upper.elbowDeg[side],
    protraction: share * ARM_STYLE.protractionM,
  };
}

function heldAngles(reading: GaitReading, side: SideId): ArmAngles {
  return {
    flexDeg: ARM_STYLE.held.flexDeg + sideSign(side) * ARM_STYLE.held.crossDeg,
    abductionDeg: ARM_STYLE.held.abductionDeg,
    innerRotationDeg: ARM_STYLE.held.innerRotationDeg,
    elbowDeg: reading.upper.elbowDeg[side],
    protraction: ARM_STYLE.protractionM,
  };
}

export function armAngles(reading: GaitReading, side: SideId): ArmAngles {
  return reading.upper.holdsArms ? heldAngles(reading, side) : swingingAngles(reading, side);
}

export function solveArm(reading: GaitReading, trunk: TrunkState, side: SideId): ArmChain {
  const angles = armAngles(reading, side);
  const sign = sideSign(side);
  const shoulder = apply(
    trunk.rotation,
    angles.protraction,
    0,
    sign * RIG_BODY.shoulderHalfWidthM,
  ).add(trunk.shoulders);
  const upper = trunk.rotation
    .clone()
    .multiply(
      fromEuler(
        toRadians(-sign * angles.abductionDeg),
        toRadians(sign * angles.innerRotationDeg),
        toRadians(angles.flexDeg),
        'ZXY',
      ),
    );
  const elbow = apply(upper, 0, -RIG_BODY.upperArmM, 0).add(shoulder);
  const forearm = upper.clone().multiply(about(Z_AXIS, Math.PI - toRadians(angles.elbowDeg)));
  const wrist = apply(forearm, 0, -RIG_BODY.forearmM, 0).add(elbow);
  const hand = forearm
    .clone()
    .multiply(fromEuler(0, toRadians(sign * ARM_STYLE.pronationDeg), 0, 'ZXY'))
    .multiply(about(Z_AXIS, toRadians(ARM_STYLE.wristFlexDeg)));
  return {
    shoulder,
    elbow,
    wrist,
    upper,
    forearm,
    handAxis: apply(hand, 0, -1, 0),
    palm: apply(hand, 0, 0, -sign),
    handShape: reading.upper.holdsArms ? RESTING_HAND : LOOSE_FIST,
  };
}
