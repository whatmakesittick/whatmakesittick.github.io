import { Quaternion, Vector3 } from 'three';
import { FULL_TURN, lerp, smoothstep, toRadians } from '@core/math';
import type { ArmId, KickId, LegReading, StrokeReading } from '../../ids';
import { phaseBounds } from '../../model/phases';
import { CYCLE_UNITS } from '../../model/playback';
import { LEFT_ARM_OFFSET_UNITS } from '../../model/stroke';
import { SIDE, createArmPose, roll } from './arm';
import type { ArmPose } from './arm';
import { solveArm } from './armTrack';
import { BODY, BREATH_HEAD, KICK, KICK_SHAPES } from './constants';
import { periodicCurve } from './curve';

export { SIDE, armClock } from './arm';
export type { ArmPose } from './arm';
export { solveArm } from './armTrack';

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
  hipLiftM: number;
  readonly arms: Readonly<Record<ArmId, ArmPose>>;
  readonly legs: Readonly<Record<ArmId, LegPose>>;
  readonly neck: Vector3;
  readonly head: Quaternion;
}

const LEG_OFFSET_UNITS: Readonly<Record<ArmId, number>> = { left: 0, right: LEFT_ARM_OFFSET_UNITS };

const X_AXIS = new Vector3(1, 0, 0);
const Z_AXIS = new Vector3(0, 0, 1);
const turn = new Quaternion();
const direction = new Vector3();

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
    hipLiftM: 0,
    arms: { right: createArmPose(), left: createArmPose() },
    legs: { right: legPose(), left: legPose() },
    neck: new Vector3(),
    head: new Quaternion(),
  };
}

function kickStrength(legCycleUnits: number, kick: KickId, headUpShare: number): number {
  const beat =
    kick === 'six' ? KICK.strongBeatShare * Math.cos((FULL_TURN * legCycleUnits) / CYCLE_UNITS) : 0;
  return (1 + beat) * (1 + KICK.headUpGain * headUpShare);
}

function inLegPlane(target: Vector3, angle: number, side: number, inward: number): Vector3 {
  return target.set(-Math.cos(angle), -Math.sin(angle), -side * inward).normalize();
}

export function hipLift(legs: StrokeReading['legs'], kick: KickId): number {
  const { heave } = KICK_SHAPES[kick];
  const lift = (leg: LegReading) => periodicCurve(heave, 1, leg.phase);
  return KICK.hipHeaveM * (lift(legs.left) + lift(legs.right));
}

export function solveLeg(
  pose: LegPose,
  leg: LegReading,
  kick: KickId,
  side: number,
  hipRollRad: number,
  strength = 1,
  hipLiftM = 0,
): void {
  const shape = KICK_SHAPES[kick];
  const depthGain = (strength * leg.depthM) / KICK.depthM;
  const kneeGain = 1 + ((strength - 1) * KICK.headUpKneeGain) / KICK.headUpGain;
  const thigh = toRadians(
    shape.restDeg + shape.thighDeg * depthGain * periodicCurve(shape.thigh, 1, leg.phase),
  );
  const knee = toRadians(
    shape.kneeDeg * kneeGain * Math.max(periodicCurve(shape.knee, 1, leg.phase), 0),
  );
  const shank = thigh - knee;
  const ankle = shank + toRadians(periodicCurve(shape.ankleDeg, 1, leg.phase));
  turn.setFromAxisAngle(X_AXIS, hipRollRad);
  roll(pose.hip, BODY.hipX, BODY.hipY + hipLiftM, side * BODY.hipHalf, hipRollRad);
  pose.knee.copy(inLegPlane(direction, thigh, side, KICK.adduction).applyQuaternion(turn));
  pose.knee.multiplyScalar(BODY.thigh).add(pose.hip);
  pose.ankle.copy(inLegPlane(direction, shank, side, KICK.adduction).applyQuaternion(turn));
  pose.ankle.multiplyScalar(BODY.shank).add(pose.knee);
  inLegPlane(pose.footAxis, ankle, side, KICK.toeIn).applyQuaternion(turn);
  pose.sole.set(-Math.sin(ankle), Math.cos(ankle), 0).applyQuaternion(turn);
  pose.sole.addScaledVector(pose.footAxis, -pose.sole.dot(pose.footAxis)).normalize();
  pose.toe.copy(pose.ankle).addScaledVector(pose.footAxis, BODY.foot);
}

function breathShare(reading: StrokeReading): number {
  if (reading.breathing !== 'right') return 0;
  const [start, end] = phaseBounds(reading.pace).recovery;
  const progress = (reading.units - start) / (end - start);
  const { turnOut, turnBack } = BREATH_HEAD;
  return (
    smoothstep(progress, turnOut[0], turnOut[1]) *
    (1 - smoothstep(progress, turnBack[0], turnBack[1]))
  );
}

export function solveHead(skeleton: Skeleton, reading: StrokeReading, headUpShare: number): void {
  const follow = BODY.headFollow * skeleton.shoulderRollRad;
  const headRoll = lerp(follow, toRadians(BODY.breathHeadDeg), breathShare(reading));
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
  skeleton.hipLiftM = hipLift(reading.legs, reading.kick);
  const { pace, breathing } = reading;
  (['right', 'left'] as const).forEach((id) => {
    solveArm(skeleton.arms[id], id, reading.units, { pace, breathing, rootY });
    const strength = kickStrength(reading.units - LEG_OFFSET_UNITS[id], reading.kick, headUpShare);
    solveLeg(
      skeleton.legs[id],
      reading.legs[id],
      reading.kick,
      SIDE[id],
      skeleton.hipRollRad,
      strength,
      skeleton.hipLiftM,
    );
  });
  solveHead(skeleton, reading, headUpShare);
  return skeleton;
}
