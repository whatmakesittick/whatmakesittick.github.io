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
  readonly curl: number;
}

export const ARM_STYLE = {
  abductionDeg: { back: 9, front: 11 },
  innerRotationDeg: { back: 6, front: 36 },
  curl: 2.6,
  protractionM: 0.012,
  pronationDeg: 18,
  wristFlexDeg: 8,
  held: { flexDeg: 39, crossDeg: 3, abductionDeg: -8, innerRotationDeg: 74 },
} as const;

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
    abductionDeg: between(ARM_STYLE.abductionDeg.back, ARM_STYLE.abductionDeg.front, share),
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
    curl: ARM_STYLE.curl,
  };
}
