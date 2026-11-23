import type { Quaternion } from 'three';
import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import { solveTwoBone } from '@core/rig/ik';
import type { GaitReading, LegReading, SideId } from '../../ids';
import { GAIT_DATA } from '../../model/gaitData';
import { RIG_BODY } from './body';
import {
  Y_AXIS,
  Z_AXIS,
  about,
  apply,
  fromBasis,
  fromEuler,
  mirror,
  perpendicular,
  relative,
  sideSign,
  toEuler,
} from './frames';
import type { PelvisState } from './pelvis';
import { TOE_OUT_RAD } from './shoe';

export interface LegAngles {
  readonly hipFlex: number;
  readonly hipAdd: number;
  readonly hipRot: number;
  readonly knee: number;
  readonly ankleDorsi: number;
  readonly ankleInv: number;
  readonly ankleRot: number;
  readonly toe: number;
}

export interface LegChain {
  readonly hip: Vector3;
  readonly knee: Vector3;
  readonly ankle: Vector3;
  readonly thigh: Quaternion;
  readonly shank: Quaternion;
  readonly foot: Quaternion;
  readonly toe: number;
}

const ANGLE_KEYS = [
  'hipFlex',
  'hipAdd',
  'hipRot',
  'knee',
  'ankleDorsi',
  'ankleInv',
  'ankleRot',
  'toe',
] as const satisfies readonly (keyof LegAngles)[];

export function dataAngles(leg: LegReading): LegAngles {
  return {
    hipFlex: toRadians(leg.hipFlexDeg),
    hipAdd: toRadians(leg.hipAddDeg),
    hipRot: toRadians(leg.hipRotDeg),
    knee: toRadians(leg.kneeFlexDeg),
    ankleDorsi: toRadians(leg.ankleDorsiDeg),
    ankleInv: 0,
    ankleRot: 0,
    toe: 0,
  };
}

export const HIP_ROTATION_GAIN = 0.35;

export function targetAngles(reading: GaitReading, side: SideId, abductionRad = 0): LegAngles {
  const data = dataAngles(reading[side]);
  const meanRotation = toRadians(GAIT_DATA[reading.pace].angles.hipRot.a0);
  return {
    ...data,
    hipAdd: data.hipAdd - abductionRad,
    hipRot: HIP_ROTATION_GAIN * (data.hipRot - meanRotation),
  };
}

export function mixAngles(from: LegAngles, to: LegAngles, share: number): LegAngles {
  const out = { ...from };
  ANGLE_KEYS.forEach((key) => {
    out[key] = from[key] + (to[key] - from[key]) * share;
  });
  return out;
}

export function hipJoint(pelvis: PelvisState, side: SideId): Vector3 {
  return apply(pelvis.rotation, 0, 0, sideSign(side) * RIG_BODY.hipHalfWidthM).add(pelvis.position);
}

function toeOut(side: SideId): Quaternion {
  return about(Y_AXIS, -sideSign(side) * TOE_OUT_RAD);
}

export function legChain(pelvis: PelvisState, side: SideId, angles: LegAngles): LegChain {
  const hip = hipJoint(pelvis, side);
  const thigh = pelvis.rotation
    .clone()
    .multiply(mirror(fromEuler(angles.hipAdd, angles.hipRot, angles.hipFlex, 'ZXY'), side));
  const knee = apply(thigh, 0, -RIG_BODY.thighM, 0).add(hip);
  const shank = thigh.clone().multiply(about(Z_AXIS, -angles.knee));
  const ankle = apply(shank, 0, -RIG_BODY.shankM, 0).add(knee);
  const foot = shank
    .clone()
    .multiply(mirror(fromEuler(angles.ankleInv, angles.ankleRot, angles.ankleDorsi, 'ZXY'), side))
    .multiply(toeOut(side));
  return { hip, knee, ankle, thigh, shank, foot, toe: angles.toe };
}

export function kneePole(chain: LegChain): Vector3 {
  return apply(chain.thigh, 1, 0, 0);
}

export function closeLeg(
  pelvis: PelvisState,
  side: SideId,
  ankle: Vector3,
  pole: Vector3,
  foot: Quaternion,
  toe: number,
): { chain: LegChain; angles: LegAngles } {
  const hip = hipJoint(pelvis, side);
  const knee = solveTwoBone(hip, ankle, RIG_BODY.thighM, RIG_BODY.shankM, pole, new Vector3());
  const thighDown = knee.clone().sub(hip).normalize();
  const shankDown = ankle.clone().sub(knee).normalize();
  const forward = perpendicular(pole, thighDown);
  const up = thighDown.clone().negate();
  const hinge = new Vector3().crossVectors(forward, up);
  const thigh = fromBasis(forward, up, hinge);
  const shankUp = shankDown.clone().negate();
  const shank = fromBasis(new Vector3().crossVectors(shankUp, hinge), shankUp, hinge);
  const bend = Math.atan2(
    new Vector3().crossVectors(thighDown, shankDown).dot(hinge),
    thighDown.dot(shankDown),
  );
  const hipTurn = toEuler(mirror(relative(pelvis.rotation, thigh), side), 'ZXY');
  const ankleTurn = toEuler(
    mirror(relative(shank, foot.clone().multiply(toeOut(side).invert())), side),
    'ZXY',
  );
  const angles: LegAngles = {
    hipFlex: hipTurn.z,
    hipAdd: hipTurn.x,
    hipRot: hipTurn.y,
    knee: -bend,
    ankleDorsi: ankleTurn.z,
    ankleInv: ankleTurn.x,
    ankleRot: ankleTurn.y,
    toe,
  };
  return { chain: { hip, knee, ankle, thigh, shank, foot, toe }, angles };
}

export function footPitch(foot: Quaternion): number {
  const axis = apply(foot, 1, 0, 0);
  return Math.asin(Math.max(-1, Math.min(1, axis.y)));
}

export function footYaw(foot: Quaternion): number {
  const axis = apply(foot, 1, 0, 0);
  return Math.atan2(-axis.z, axis.x);
}
