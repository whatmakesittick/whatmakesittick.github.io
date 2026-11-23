import type { Vector3 } from 'three';
import type { SideId } from '../../../ids';
import type { RunnerPose } from '../../runnerPose';

export interface ProxySegment {
  readonly from: Vector3;
  readonly to: Vector3;
  readonly radius: number;
}

const RADIUS = {
  head: 0.11,
  neck: 0.05,
  torso: 0.15,
  pelvis: 0.12,
  upperArm: 0.045,
  forearm: 0.038,
  thigh: 0.075,
  shin: 0.048,
  foot: 0.045,
} as const;

const SIDES: readonly SideId[] = ['right', 'left'];
const HAND_REACH_M = 0.07;
const FOOT_LIFT_M = 0.045;
const TORSO_BASE_LIFT_M = 0.08;

export const PROXY_COUNT = 14;

function segment(from: Vector3, to: Vector3, radius: number): ProxySegment {
  return { from, to, radius };
}

function lifted(point: Vector3, metres: number): Vector3 {
  return point.clone().setY(point.y + metres);
}

function beyond(from: Vector3, to: Vector3, metres: number): Vector3 {
  const direction = to.clone().sub(from).normalize();
  return to.clone().addScaledVector(direction, metres);
}

export function proxySegments(pose: RunnerPose): ProxySegment[] {
  const { legs, arms } = pose;
  const torsoBase = pose.pelvis.clone().addScaledVector(pose.trunkUp, TORSO_BASE_LIFT_M);
  const top: ProxySegment[] = [
    segment(pose.headCentre, pose.headTop, RADIUS.head),
    segment(pose.chest, pose.headCentre, RADIUS.neck),
    segment(torsoBase, pose.chest, RADIUS.torso),
    segment(legs.left.hip, legs.right.hip, RADIUS.pelvis),
  ];
  const arm = SIDES.flatMap((side) => [
    segment(arms[side].shoulder, arms[side].elbow, RADIUS.upperArm),
    segment(
      arms[side].elbow,
      beyond(arms[side].elbow, arms[side].wrist, HAND_REACH_M),
      RADIUS.forearm,
    ),
  ]);
  const leg = SIDES.flatMap((side) => [
    segment(legs[side].hip, legs[side].knee, RADIUS.thigh),
    segment(legs[side].knee, legs[side].ankle, RADIUS.shin),
  ]);
  const feet = SIDES.map((side) =>
    segment(lifted(legs[side].heel, FOOT_LIFT_M), lifted(legs[side].toe, FOOT_LIFT_M), RADIUS.foot),
  );
  return [...top, ...arm, ...leg, ...feet];
}
