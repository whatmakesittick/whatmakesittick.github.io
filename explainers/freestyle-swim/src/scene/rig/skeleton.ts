import { Quaternion, Vector3 } from 'three';
import { FULL_TURN, lerp, toRadians } from '@core/math';
import { PHASE_IDS } from '../../ids';
import type { ArmId, ArmReading, KickId, LegReading, StrokeReading } from '../../ids';
import {
  ARM_KEYS,
  ARM_PERIOD,
  BODY,
  CATCH_AT,
  HEEL_SHARE,
  KICK,
  REACH_SOFT,
  RECOVERY_START,
} from './constants';
import { clampedCurve, periodicCurve, periodicVector } from './curve';
import { lawOfCosines, solveTwoBone } from './ik';

export interface ArmPose {
  readonly shoulder: Vector3;
  readonly elbow: Vector3;
  readonly wrist: Vector3;
  readonly hand: Vector3;
  readonly handAxis: Vector3;
  readonly palm: Vector3;
}

export interface LegPose {
  readonly hip: Vector3;
  readonly knee: Vector3;
  readonly ankle: Vector3;
  readonly toe: Vector3;
  readonly footAxis: Vector3;
  readonly sole: Vector3;
}

export interface Skeleton {
  shoulderRollRad: number;
  hipRollRad: number;
  readonly arms: Readonly<Record<ArmId, ArmPose>>;
  readonly legs: Readonly<Record<ArmId, LegPose>>;
  readonly neck: Vector3;
  readonly head: Quaternion;
}

export const SIDE: Readonly<Record<ArmId, number>> = { right: 1, left: -1 };

const WRIST_PASSES = 3;
const X_AXIS = new Vector3(1, 0, 0);
const Z_AXIS = new Vector3(0, 0, 1);
const turn = new Quaternion();
const reachHint = new Vector3();
const pole = new Vector3();
const palmHint = new Vector3();
const forearm = new Vector3();
const direction = new Vector3();

function armPose(): ArmPose {
  return {
    shoulder: new Vector3(),
    elbow: new Vector3(),
    wrist: new Vector3(),
    hand: new Vector3(),
    handAxis: new Vector3(),
    palm: new Vector3(),
  };
}

function legPose(): LegPose {
  return {
    hip: new Vector3(),
    knee: new Vector3(),
    ankle: new Vector3(),
    toe: new Vector3(),
    footAxis: new Vector3(),
    sole: new Vector3(),
  };
}

export function createSkeleton(): Skeleton {
  return {
    shoulderRollRad: 0,
    hipRollRad: 0,
    arms: { right: armPose(), left: armPose() },
    legs: { right: legPose(), left: legPose() },
    neck: new Vector3(),
    head: new Quaternion(),
  };
}

function roll(target: Vector3, x: number, y: number, z: number, angle: number): Vector3 {
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
  const dx = reachHint.x - shoulder.x;
  const dz = reachHint.z - shoulder.z;
  const length = Math.hypot(dx, dz) || 1;
  wrist.set(
    shoulder.x + (dx / length) * across,
    shoulder.y + drop,
    shoulder.z + (dz / length) * across,
  );
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

export function solveArm(
  pose: ArmPose,
  arm: ArmReading,
  side: number,
  shoulderRollRad: number,
  rootY: number,
): void {
  const clock = armClock(arm);
  const protraction = periodicCurve(ARM_KEYS.protraction, ARM_PERIOD, clock);
  roll(pose.shoulder, protraction, 0, side * BODY.shoulderHalf, shoulderRollRad);
  pose.shoulder.y += periodicCurve(ARM_KEYS.elevation, ARM_PERIOD, clock);
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
    mirrored(palmHint, palmValue, side);
    orientHand(pose, flexRad);
    handLift = pose.hand.y - pose.wrist.y;
  }
}

function kneeFlexDeg(phase: number, kick: KickId): number {
  const offset = phase - KICK.kneePeak;
  const wrapped = offset - Math.round(offset);
  if (Math.abs(wrapped) >= KICK.kneeWindow) return 0;
  return KICK.kneeDeg[kick] * Math.cos((Math.PI * wrapped) / (2 * KICK.kneeWindow)) ** 2;
}

function inLegPlane(target: Vector3, angle: number, side: number, inward: number): Vector3 {
  return target.set(-Math.cos(angle), -Math.sin(angle), -side * inward).normalize();
}

export function solveLeg(
  pose: LegPose,
  leg: LegReading,
  kick: KickId,
  side: number,
  hipRollRad: number,
): void {
  const wave = FULL_TURN * (leg.phase + KICK.thighLead);
  const thigh = toRadians(KICK.restDeg + KICK.thighPerDepthDeg * leg.depthM * Math.sin(wave));
  const shank = thigh - toRadians(kneeFlexDeg(leg.phase, kick));
  const ankle =
    shank + toRadians(KICK.ankleRestDeg - KICK.ankleSwingDeg * Math.cos(FULL_TURN * leg.phase));
  turn.setFromAxisAngle(X_AXIS, hipRollRad);
  roll(pose.hip, BODY.hipX, BODY.hipY, side * BODY.hipHalf, hipRollRad);
  pose.knee.copy(inLegPlane(direction, thigh, side, 0).applyQuaternion(turn));
  pose.knee.multiplyScalar(BODY.thigh).add(pose.hip);
  pose.ankle.copy(inLegPlane(direction, shank, side, 0).applyQuaternion(turn));
  pose.ankle.multiplyScalar(BODY.shank).add(pose.knee);
  inLegPlane(pose.footAxis, ankle, side, KICK.toeIn).applyQuaternion(turn);
  pose.sole.set(-Math.sin(ankle), Math.cos(ankle), 0).applyQuaternion(turn);
  pose.sole.addScaledVector(pose.footAxis, -pose.sole.dot(pose.footAxis)).normalize();
  pose.toe.copy(pose.ankle).addScaledVector(pose.footAxis, BODY.foot * (1 - HEEL_SHARE));
}

export function solveHead(skeleton: Skeleton, headTurn: number, headUpShare: number): void {
  const follow = BODY.headFollow * skeleton.shoulderRollRad;
  const headRoll = lerp(follow, toRadians(BODY.breathHeadDeg), headTurn);
  const [x, y, z] = BODY.neckBase;
  roll(skeleton.neck, x, y, z, skeleton.shoulderRollRad);
  skeleton.head.setFromAxisAngle(X_AXIS, headRoll);
  turn.setFromAxisAngle(Z_AXIS, toRadians(BODY.headUpNeckDeg * headUpShare));
  skeleton.head.multiply(turn);
}

export function solveSkeleton(
  skeleton: Skeleton,
  reading: StrokeReading,
  headUpShare: number,
  rootY: number,
): Skeleton {
  skeleton.shoulderRollRad = toRadians(reading.shoulderRollDeg);
  skeleton.hipRollRad = toRadians(reading.hipRollDeg);
  (['right', 'left'] as const).forEach((id) => {
    solveArm(skeleton.arms[id], reading[id], SIDE[id], skeleton.shoulderRollRad, rootY);
    solveLeg(skeleton.legs[id], reading.legs[id], reading.kick, SIDE[id], skeleton.hipRollRad);
  });
  solveHead(skeleton, reading.headTurn, headUpShare);
  return skeleton;
}
