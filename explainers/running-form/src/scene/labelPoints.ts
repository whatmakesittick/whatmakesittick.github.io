import { Vector3 } from 'three';
import type { PartId } from '../ids';
import type { RunnerPose } from './runnerPose';

const ROAD_LABEL_AT = new Vector3(0.6, 0, 0.7);
const RIGHT = new Vector3(0, 0, 1);

const SURFACE_M = {
  head: 0.03,
  shoulder: 0.05,
  arm: 0.045,
  elbow: 0.04,
  trunk: 0.06,
  pelvis: 0.06,
  hip: 0.08,
  thigh: 0.08,
  knee: 0.05,
  shin: 0.05,
  achilles: 0.02,
  arch: 0.03,
  heel: 0.03,
  shoe: 0.03,
} as const;

const CAP_TOP_M = 0.04;
const STERNUM = { below: 0.17, ahead: 0.1 } as const;
const SACRUM = { behind: 0.1, above: 0.06 } as const;
const ACHILLES = { behind: 0.055, above: 0.05 } as const;
const ARCH_ABOVE_SOLE_M = 0.02;
const HEEL = { behind: 0.015, above: 0.05 } as const;
const TOE_BOX = { behind: 0.035, above: 0.045 } as const;

function middle(a: Vector3, b: Vector3): Vector3 {
  return a.clone().lerp(b, 0.5);
}

function onRight(point: Vector3, metres: number): Vector3 {
  return point.addScaledVector(RIGHT, metres);
}

export function labelPoints(pose: RunnerPose): Record<PartId, Vector3> {
  const leg = pose.legs.right;
  const arm = pose.arms.right;
  const foot = leg.toe.clone().sub(leg.heel).normalize();
  const up = new Vector3(0, 1, 0);
  return {
    head: onRight(pose.headTop.clone().addScaledVector(pose.trunkUp, CAP_TOP_M), SURFACE_M.head),
    shoulder: onRight(arm.shoulder.clone(), SURFACE_M.shoulder),
    arm: onRight(middle(arm.shoulder, arm.elbow), SURFACE_M.arm),
    elbow: onRight(arm.elbow.clone(), SURFACE_M.elbow),
    trunk: onRight(
      pose.chest
        .clone()
        .addScaledVector(pose.trunkUp, -STERNUM.below)
        .addScaledVector(pose.trunkForward, STERNUM.ahead),
      SURFACE_M.trunk,
    ),
    pelvis: onRight(
      pose.pelvis
        .clone()
        .addScaledVector(pose.trunkForward, -SACRUM.behind)
        .addScaledVector(pose.trunkUp, SACRUM.above),
      SURFACE_M.pelvis,
    ),
    hip: onRight(leg.hip.clone(), SURFACE_M.hip),
    thigh: onRight(middle(leg.hip, leg.knee), SURFACE_M.thigh),
    knee: onRight(leg.knee.clone(), SURFACE_M.knee),
    shin: onRight(middle(leg.knee, leg.ankle), SURFACE_M.shin),
    achilles: onRight(
      leg.ankle.clone().addScaledVector(foot, -ACHILLES.behind).addScaledVector(up, ACHILLES.above),
      SURFACE_M.achilles,
    ),
    arch: onRight(
      middle(leg.heel, leg.ball).addScaledVector(up, ARCH_ABOVE_SOLE_M),
      SURFACE_M.arch,
    ),
    heel: onRight(
      leg.heel.clone().addScaledVector(foot, -HEEL.behind).addScaledVector(up, HEEL.above),
      SURFACE_M.heel,
    ),
    shoe: onRight(
      leg.toe.clone().addScaledVector(foot, -TOE_BOX.behind).addScaledVector(up, TOE_BOX.above),
      SURFACE_M.shoe,
    ),
    road: ROAD_LABEL_AT.clone(),
  };
}
