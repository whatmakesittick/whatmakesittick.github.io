import { Quaternion, Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { RigArm, RigLeg, RigPose } from '@core/figure/body/figureRig';
import type { GaitReading, SideId } from '../../ids';
import { SIDE_IDS } from '../../ids';
import type { RunnerPose } from '../runnerPose';
import { solveArm } from './arm';
import type { ArmChain } from './arm';
import { RIG_BODY, restJoint } from './body';
import { lowestSole } from './foot';
import { Y_AXIS, Z_AXIS, about, apply, mirrorPoint } from './frames';
import type { LegChain } from './leg';
import { bodyPelvisUp, pelvisAt, trunkAt } from './pelvis';
import type { PelvisState, TrunkState } from './pelvis';
import { BALL_PIVOT, BARE_TOE_AXIS, DROP_RAD, PROFILE } from './shoe';
import { solveLeg } from './stance';
import { touchdownFor } from './touchdown';
import type { LegSolution } from './stance';

export const HEAD_FOLLOW = 0.2;
const NECK_SHARE = 0.45;
const DOWN = new Vector3(0, -1, 0);

export interface RunnerLegRig extends RigLeg {
  readonly toeAxis: Vector3;
  readonly solution: LegSolution;
}

export interface RunnerSkeleton extends RigPose {
  readonly arms: Readonly<Record<SideId, RigArm & { readonly chain: ArmChain }>>;
  readonly legs: Readonly<Record<SideId, RunnerLegRig>>;
  readonly head: Quaternion;
  readonly pelvisUp: Vector3;
  readonly pelvis: PelvisState;
  readonly trunk: TrunkState;
  readonly reading: GaitReading;
}

const restAnkle = restJoint('ankle');
const restBall = restJoint('ball');
const bareAxis = restBall.clone().sub(restAnkle).normalize();

function bareLocal(direction: Vector3, side: SideId): Vector3 {
  const forward = new Vector3(bareAxis.x, 0, bareAxis.z).normalize();
  const right = new Vector3().crossVectors(forward, Y_AXIS);
  return mirrorPoint(new Vector3(direction.dot(forward), direction.y, direction.dot(right)), side);
}

const BARE_AXIS_LOCAL: Record<SideId, Vector3> = {
  right: bareLocal(bareAxis, 'right'),
  left: bareLocal(bareAxis, 'left'),
};

function rigLeg(chain: LegChain, side: SideId, solution: LegSolution): RunnerLegRig {
  const bare = chain.foot.clone().multiply(about(Z_AXIS, -DROP_RAD));
  const footAxis = BARE_AXIS_LOCAL[side].clone().applyQuaternion(bare);
  const sole = DOWN.clone().applyQuaternion(bare);
  const toeLocal = mirrorPoint(BARE_TOE_AXIS, side).applyAxisAngle(Z_AXIS, chain.toe);
  return {
    hip: chain.hip,
    knee: chain.knee,
    ankle: chain.ankle,
    footAxis,
    sole,
    toeAxis: toeLocal.applyQuaternion(bare),
    solution,
  };
}

function rigArm(chain: ArmChain): RigArm & { readonly chain: ArmChain } {
  return {
    shoulder: chain.shoulder,
    elbow: chain.elbow,
    wrist: chain.wrist,
    handAxis: chain.handAxis,
    palm: chain.palm,
    curl: chain.curl,
    chain,
  };
}

function headRotation(reading: GaitReading): Quaternion {
  return about(Y_AXIS, toRadians(HEAD_FOLLOW * reading.upper.shoulderRotDeg));
}

export function solveSkeleton(reading: GaitReading): RunnerSkeleton {
  const { hipHeightM } = touchdownFor(reading.pace, reading.stepRate);
  const pelvis = pelvisAt(reading, hipHeightM);
  const trunk = trunkAt(reading, pelvis);
  const legs = {} as Record<SideId, RunnerLegRig>;
  const arms = {} as Record<SideId, RigArm & { readonly chain: ArmChain }>;
  SIDE_IDS.forEach((side) => {
    const solution = solveLeg(reading, side, pelvis);
    legs[side] = rigLeg(solution.chain, side, solution);
    arms[side] = rigArm(solveArm(reading, trunk, side));
  });
  return {
    arms,
    legs,
    head: headRotation(reading),
    pelvisUp: bodyPelvisUp(pelvis),
    pelvis,
    trunk,
    reading,
  };
}

function inTrunk(trunk: TrunkState, offset: readonly [number, number]): Vector3 {
  return apply(trunk.rotation, offset[0], offset[1], 0).add(trunk.shoulders);
}

function neckRotation(skeleton: RunnerSkeleton): Quaternion {
  const chest = skeleton.trunk.rotation.clone();
  const local = chest.clone().invert().multiply(skeleton.head);
  return chest.multiply(new Quaternion().slerp(local, NECK_SHARE));
}

function outsolePoint(chain: LegChain, x: number, y: number, fore: boolean): Vector3 {
  const rotation = fore ? chain.foot.clone().multiply(about(Z_AXIS, chain.toe)) : chain.foot;
  if (!fore) return apply(rotation, x, y, 0).add(chain.ankle);
  const ball = apply(chain.foot, BALL_PIVOT.x, BALL_PIVOT.y, 0).add(chain.ankle);
  return apply(rotation, x - BALL_PIVOT.x, y - BALL_PIVOT.y, 0).add(ball);
}

export function poseOf(skeleton: RunnerSkeleton): RunnerPose {
  const { trunk, pelvis, reading } = skeleton;
  const chest = inTrunk(trunk, RIG_BODY.neckOverShoulders);
  const restNeck = restJoint('neck');
  const headJoint = restJoint('head')
    .sub(restNeck)
    .applyQuaternion(neckRotation(skeleton))
    .add(chest);
  const headUp = apply(skeleton.head, 0, 1, 0);
  const legs = {} as RunnerPose['legs'];
  const arms = {} as RunnerPose['arms'];
  SIDE_IDS.forEach((side) => {
    const { chain } = skeleton.legs[side].solution;
    const heel = PROFILE.rear[0].start;
    const toe = PROFILE.fore[PROFILE.fore.length - 1].start;
    const ball = PROFILE.fore[0].start;
    legs[side] = {
      hip: chain.hip.clone(),
      knee: chain.knee.clone(),
      ankle: chain.ankle.clone(),
      heel: outsolePoint(chain, heel.x, heel.y, false),
      ball: outsolePoint(chain, ball.x, ball.y, true),
      toe: outsolePoint(chain, toe.x, toe.y, true),
      contact: reading[side].contact ? lowestSole(chain.ankle, chain.foot, chain.toe, side) : null,
    };
    const arm = skeleton.arms[side];
    arms[side] = {
      shoulder: arm.shoulder.clone(),
      elbow: arm.elbow.clone(),
      wrist: arm.wrist.clone(),
    };
  });
  return {
    pelvis: pelvis.position.clone(),
    chest,
    headCentre: headJoint.clone().addScaledVector(headUp, RIG_BODY.headTopAboveHeadM / 2),
    headTop: headJoint.clone().addScaledVector(headUp, RIG_BODY.headTopAboveHeadM),
    trunkForward: apply(trunk.rotation, 1, 0, 0),
    trunkUp: apply(trunk.rotation, 0, 1, 0),
    arms,
    legs,
  };
}

export function solvePose(reading: GaitReading): RunnerPose {
  return poseOf(solveSkeleton(reading));
}
