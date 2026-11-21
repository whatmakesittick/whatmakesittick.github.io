import { Vector3 } from 'three';
import { smoothstep, toRadians } from '@core/math';
import { PHASE_IDS } from '../../ids';
import type { ArmId, ArmReading } from '../../ids';
import {
  ARM_KEYS,
  ARM_PERIOD,
  BODY,
  CATCH_AT,
  REACH_SOFT,
  RECOVERY_PATH,
  RECOVERY_START,
} from './constants';
import { clampedCurve, clampedVector, periodicCurve, periodicVector } from './curve';
import { lawOfCosines, solveTwoBone } from './ik';

export interface ArmPose {
  readonly shoulder: Vector3;
  readonly elbow: Vector3;
  readonly wrist: Vector3;
  readonly hand: Vector3;
  readonly handAxis: Vector3;
  readonly palm: Vector3;
}

export const SIDE: Readonly<Record<ArmId, number>> = { right: 1, left: -1 };

const WRIST_PASSES = 3;
const reachHint = new Vector3();
const pole = new Vector3();
const palmHint = new Vector3();
const forearm = new Vector3();
const keyedWrist = new Vector3();
const keyedElbow = new Vector3();
const bone = new Vector3();

export function createArmPose(): ArmPose {
  return {
    shoulder: new Vector3(),
    elbow: new Vector3(),
    wrist: new Vector3(),
    hand: new Vector3(),
    handAxis: new Vector3(),
    palm: new Vector3(),
  };
}

export function roll(target: Vector3, x: number, y: number, z: number, angle: number): Vector3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return target.set(x, y * cos - z * sin, y * sin + z * cos);
}

export function armClock(arm: ArmReading): number {
  return PHASE_IDS.indexOf(arm.phase) + arm.progress;
}

function elbowDeg(arm: ArmReading, clock: number): number {
  if (arm.elbowDeg !== null) return arm.elbowDeg;
  return clock < CATCH_AT
    ? clampedCurve(ARM_KEYS.entryElbow, clock)
    : clampedCurve(ARM_KEYS.recoveryElbow, clock);
}

function handHeight(arm: ArmReading, clock: number): number {
  if (arm.handDepthM !== null) return -arm.handDepthM;
  return clampedCurve(ARM_KEYS.recoveryHeight, Math.max(clock, RECOVERY_START));
}

function mirrored(target: Vector3, value: readonly number[], side: number): Vector3 {
  return target.set(value[0], value[1], value[2] * side);
}

function softShare(share: number): number {
  const size = Math.abs(share);
  if (size <= REACH_SOFT.knee) return share;
  return (
    Math.sign(share) *
    (REACH_SOFT.knee + REACH_SOFT.span * Math.tanh((size - REACH_SOFT.knee) / REACH_SOFT.span))
  );
}

function placeWrist(pose: ArmPose, reach: number, wristY: number): void {
  const { shoulder, wrist } = pose;
  const drop = reach * softShare((wristY - shoulder.y) / reach);
  const across = Math.sqrt(reach * reach - drop * drop);
  const length = Math.hypot(reachHint.x, reachHint.z) || 1;
  wrist.set(
    shoulder.x + (reachHint.x / length) * across,
    shoulder.y + drop,
    shoulder.z + (reachHint.z / length) * across,
  );
}

function recoveryShare(clock: number): number {
  const { fadeIn, fadeOut } = RECOVERY_PATH;
  return smoothstep(clock, fadeIn[0], fadeIn[1]) * (1 - smoothstep(clock, fadeOut[0], fadeOut[1]));
}

function keepLength(target: Vector3, root: Vector3, length: number): void {
  bone.subVectors(target, root).setLength(length);
  target.copy(root).add(bone);
}

function followRecoveryPath(pose: ArmPose, clock: number, side: number): void {
  const share = recoveryShare(clock);
  if (share === 0) return;
  const { recoveryUpperArm, recoveryForearm } = ARM_KEYS;
  mirrored(keyedElbow, clampedVector(recoveryUpperArm, clock), side);
  keyedElbow.setLength(BODY.upperArm).add(pose.shoulder);
  mirrored(keyedWrist, clampedVector(recoveryForearm, clock), side);
  keyedWrist.setLength(BODY.forearm).add(keyedElbow);
  pose.elbow.lerp(keyedElbow, share);
  keepLength(pose.elbow, pose.shoulder, BODY.upperArm);
  pose.wrist.lerp(keyedWrist, share);
  keepLength(pose.wrist, pose.elbow, BODY.forearm);
}

function orientHand(pose: ArmPose, flexRad: number): void {
  forearm.subVectors(pose.wrist, pose.elbow).normalize();
  palmHint.addScaledVector(forearm, -palmHint.dot(forearm)).normalize();
  const cos = Math.cos(flexRad);
  const sin = Math.sin(flexRad);
  pose.handAxis.copy(forearm).multiplyScalar(cos).addScaledVector(palmHint, sin);
  pose.palm.copy(palmHint).multiplyScalar(cos).addScaledVector(forearm, -sin);
  pose.hand.copy(pose.wrist).addScaledVector(pose.handAxis, BODY.hand / 2);
}

export function placeShoulder(
  shoulder: Vector3,
  clock: number,
  side: number,
  shoulderRollRad: number,
): void {
  const protraction = periodicCurve(ARM_KEYS.protraction, ARM_PERIOD, clock);
  const halfWidth = BODY.shoulderHalf - periodicCurve(ARM_KEYS.narrowing, ARM_PERIOD, clock);
  roll(shoulder, protraction, 0, side * halfWidth, shoulderRollRad);
  shoulder.y += periodicCurve(ARM_KEYS.elevation, ARM_PERIOD, clock);
}

export function constructArm(
  pose: ArmPose,
  arm: ArmReading,
  side: number,
  shoulderRollRad: number,
  rootY: number,
): void {
  const clock = armClock(arm);
  placeShoulder(pose.shoulder, clock, side, shoulderRollRad);
  const reach = lawOfCosines(BODY.upperArm, BODY.forearm, toRadians(elbowDeg(arm, clock)));
  const targetY = handHeight(arm, clock) - rootY;
  mirrored(reachHint, periodicVector(ARM_KEYS.reach, ARM_PERIOD, clock), side);
  const poleValue = periodicVector(ARM_KEYS.pole, ARM_PERIOD, clock);
  const palmValue = periodicVector(ARM_KEYS.palm, ARM_PERIOD, clock);
  const flexRad = toRadians(periodicCurve(ARM_KEYS.wristFlexDeg, ARM_PERIOD, clock));
  let handLift = 0;
  for (let pass = 0; pass < WRIST_PASSES; pass++) {
    placeWrist(pose, reach, targetY - handLift);
    mirrored(pole, poleValue, side);
    solveTwoBone(pose.shoulder, pose.wrist, BODY.upperArm, BODY.forearm, pole, pose.elbow);
    followRecoveryPath(pose, clock, side);
    mirrored(palmHint, palmValue, side);
    orientHand(pose, flexRad);
    handLift = pose.hand.y - pose.wrist.y;
  }
}
