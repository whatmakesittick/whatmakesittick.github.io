import { Euler, Matrix4, Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { GaitReading, LegReading, SideId } from '../ids';
import { SIDE_IDS } from '../ids';
import {
  FOOT_BALL_AHEAD_OF_ANKLE_M,
  FOOT_HEEL_BEHIND_ANKLE_M,
  FOOT_TOE_AHEAD_OF_ANKLE_M,
  FOREARM_M,
  HEAD_CENTRE_ABOVE_NECK_M,
  HEAD_TOP_ABOVE_CENTRE_M,
  HIP_HALF_WIDTH_M,
  HIP_HEIGHT_M,
  NECK_ABOVE_PELVIS_M,
  SHANK_M,
  SHOULDER_BELOW_NECK_M,
  SHOULDER_HALF_WIDTH_M,
  THIGH_M,
  UPPER_ARM_M,
  ANKLE_HEIGHT_M,
} from '../model/body';

export interface RunnerArmJoints {
  shoulder: Vector3;
  elbow: Vector3;
  wrist: Vector3;
}

export interface RunnerLegJoints {
  hip: Vector3;
  knee: Vector3;
  ankle: Vector3;
  heel: Vector3;
  ball: Vector3;
  toe: Vector3;
  contact: Vector3 | null;
}

export interface RunnerPose {
  pelvis: Vector3;
  chest: Vector3;
  headCentre: Vector3;
  headTop: Vector3;
  trunkForward: Vector3;
  trunkUp: Vector3;
  arms: Record<SideId, RunnerArmJoints>;
  legs: Record<SideId, RunnerLegJoints>;
}

const STRAIGHT_ELBOW_DEG = 180;
const DOWN = new Vector3(0, -1, 0);
const FORWARD = new Vector3(1, 0, 0);
const UP = new Vector3(0, 1, 0);

function sideSign(side: SideId): number {
  return side === 'right' ? 1 : -1;
}

function rotationMatrix(x: number, y: number, z: number): Matrix4 {
  return new Matrix4().makeRotationFromEuler(new Euler(x, y, z, 'YXZ'));
}

function about(frame: Matrix4, angleDeg: number): Matrix4 {
  return frame.clone().multiply(rotationMatrix(0, 0, toRadians(angleDeg)));
}

function offsetFrom(origin: Vector3, frame: Matrix4, local: Vector3, length = 1): Vector3 {
  return origin.clone().add(local.clone().multiplyScalar(length).applyMatrix4(frame));
}

function footPoint(ankle: Vector3, frame: Matrix4, ahead: number): Vector3 {
  return ankle.clone().add(new Vector3(ahead, -ANKLE_HEIGHT_M, 0).applyMatrix4(frame));
}

function lowest(points: readonly Vector3[]): Vector3 {
  return points.reduce((best, point) => (point.y < best.y ? point : best));
}

function legOf(
  side: SideId,
  leg: LegReading,
  pelvisPosition: Vector3,
  pelvisFrame: Matrix4,
): RunnerLegJoints {
  const hip = offsetFrom(
    pelvisPosition,
    pelvisFrame,
    new Vector3(0, 0, sideSign(side) * HIP_HALF_WIDTH_M),
  );
  const abducted = pelvisFrame
    .clone()
    .multiply(rotationMatrix(toRadians(sideSign(side) * leg.hipAddDeg), 0, 0));
  const thighFrame = about(abducted, leg.hipFlexDeg);
  const knee = offsetFrom(hip, thighFrame, DOWN, THIGH_M);
  const shankFrame = about(thighFrame, -leg.kneeFlexDeg);
  const ankle = offsetFrom(knee, shankFrame, DOWN, SHANK_M);
  const footFrame = about(shankFrame, leg.ankleDorsiDeg);
  const heel = footPoint(ankle, footFrame, -FOOT_HEEL_BEHIND_ANKLE_M);
  const ball = footPoint(ankle, footFrame, FOOT_BALL_AHEAD_OF_ANKLE_M);
  const toe = footPoint(ankle, footFrame, FOOT_TOE_AHEAD_OF_ANKLE_M);
  return {
    hip,
    knee,
    ankle,
    heel,
    ball,
    toe,
    contact: leg.contact ? lowest([heel, ball, toe]).clone() : null,
  };
}

function armOf(
  side: SideId,
  flexDeg: number,
  elbowDeg: number,
  shoulderPosition: Vector3,
  trunkFrame: Matrix4,
): RunnerArmJoints {
  const shoulder = offsetFrom(
    shoulderPosition,
    trunkFrame,
    new Vector3(0, 0, sideSign(side) * SHOULDER_HALF_WIDTH_M),
  );
  const upperFrame = about(trunkFrame, flexDeg);
  const elbow = offsetFrom(shoulder, upperFrame, DOWN, UPPER_ARM_M);
  const forearmFrame = about(upperFrame, STRAIGHT_ELBOW_DEG - elbowDeg);
  return { shoulder, elbow, wrist: offsetFrom(elbow, forearmFrame, DOWN, FOREARM_M) };
}

export function referencePose(reading: GaitReading): RunnerPose {
  const { upper, com } = reading;
  const pelvis = new Vector3(com.surgeM, HIP_HEIGHT_M + com.heightM, 0);
  const pelvisFrame = rotationMatrix(
    toRadians(-upper.pelvisRollDeg),
    toRadians(upper.pelvisRotDeg),
    toRadians(-upper.pelvisTiltDeg),
  );
  const trunkFrame = rotationMatrix(0, toRadians(upper.shoulderRotDeg), toRadians(-upper.leanDeg));
  const headFrame = rotationMatrix(
    0,
    toRadians(upper.shoulderRotDeg),
    toRadians(-(upper.leanDeg + upper.headPitchDeg)),
  );
  const chest = offsetFrom(pelvis, trunkFrame, UP, NECK_ABOVE_PELVIS_M);
  const shoulderBase = offsetFrom(
    pelvis,
    trunkFrame,
    UP,
    NECK_ABOVE_PELVIS_M - SHOULDER_BELOW_NECK_M,
  );
  const headCentre = offsetFrom(chest, headFrame, UP, HEAD_CENTRE_ABOVE_NECK_M);
  const legs = {} as Record<SideId, RunnerLegJoints>;
  const arms = {} as Record<SideId, RunnerArmJoints>;
  SIDE_IDS.forEach((side) => {
    legs[side] = legOf(side, reading[side], pelvis, pelvisFrame);
    arms[side] = armOf(
      side,
      upper.shoulderFlexDeg[side],
      upper.elbowDeg[side],
      shoulderBase,
      trunkFrame,
    );
  });
  return {
    pelvis,
    chest,
    headCentre,
    headTop: offsetFrom(headCentre, headFrame, UP, HEAD_TOP_ABOVE_CENTRE_M),
    trunkForward: FORWARD.clone().applyMatrix4(trunkFrame),
    trunkUp: UP.clone().applyMatrix4(trunkFrame),
    arms,
    legs,
  };
}
