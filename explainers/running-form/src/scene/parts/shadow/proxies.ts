import type { Vector3 } from 'three';
import { SIDE_IDS } from '../../../ids';
import type { RunnerPose } from '../../runnerPose';

export interface ProxySegment {
  readonly from: Vector3;
  readonly to: Vector3;
  readonly radius: number;
  readonly endRadius: number;
}

type Taper = readonly [from: number, to: number];

const RADIUS = {
  head: [0.09, 0.085],
  neck: [0.055, 0.055],
  torso: [0.13, 0.15],
  pelvis: [0.11, 0.11],
  upperArm: [0.046, 0.038],
  forearm: [0.038, 0.03],
  thigh: [0.08, 0.052],
  shin: [0.05, 0.032],
  foot: [0.04, 0.036],
  brim: [0.028, 0.022],
} as const satisfies Record<string, Taper>;

const HAND_REACH_M = 0.08;
const SHOE_LIFT_M = 0.04;
const TORSO_BASE_LIFT_M = 0.08;
const BRIM = { aboveCentreM: 0.035, fromAheadM: 0.05, toAheadM: 0.125 } as const;

export const PROXY_COUNT = 15;

function segment(from: Vector3, to: Vector3, [radius, endRadius]: Taper): ProxySegment {
  return { from, to, radius, endRadius };
}

function lifted(point: Vector3, metres: number): Vector3 {
  return point.clone().setY(point.y + metres);
}

function beyond(from: Vector3, to: Vector3, metres: number): Vector3 {
  const direction = to.clone().sub(from).normalize();
  return to.clone().addScaledVector(direction, metres);
}

function brim(pose: RunnerPose): ProxySegment {
  const up = pose.headTop.clone().sub(pose.headCentre).normalize();
  const ahead = pose.trunkForward
    .clone()
    .addScaledVector(up, -pose.trunkForward.dot(up))
    .normalize();
  const peak = pose.headCentre.clone().addScaledVector(up, BRIM.aboveCentreM);
  return segment(
    peak.clone().addScaledVector(ahead, BRIM.fromAheadM),
    peak.clone().addScaledVector(ahead, BRIM.toAheadM),
    RADIUS.brim,
  );
}

export function proxySegments(pose: RunnerPose): ProxySegment[] {
  const { legs, arms } = pose;
  const torsoBase = pose.pelvis.clone().addScaledVector(pose.trunkUp, TORSO_BASE_LIFT_M);
  const top: ProxySegment[] = [
    segment(pose.headCentre, pose.headTop, RADIUS.head),
    brim(pose),
    segment(pose.chest, pose.headCentre, RADIUS.neck),
    segment(torsoBase, pose.chest, RADIUS.torso),
    segment(legs.left.hip, legs.right.hip, RADIUS.pelvis),
  ];
  const arm = SIDE_IDS.flatMap((side) => [
    segment(arms[side].shoulder, arms[side].elbow, RADIUS.upperArm),
    segment(
      arms[side].elbow,
      beyond(arms[side].elbow, arms[side].wrist, HAND_REACH_M),
      RADIUS.forearm,
    ),
  ]);
  const leg = SIDE_IDS.flatMap((side) => [
    segment(legs[side].hip, legs[side].knee, RADIUS.thigh),
    segment(legs[side].knee, legs[side].ankle, RADIUS.shin),
  ]);
  const feet = SIDE_IDS.map((side) =>
    segment(lifted(legs[side].heel, SHOE_LIFT_M), lifted(legs[side].toe, SHOE_LIFT_M), RADIUS.foot),
  );
  return [...top, ...arm, ...leg, ...feet];
}
