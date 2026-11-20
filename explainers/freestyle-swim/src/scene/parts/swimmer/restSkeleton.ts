import { BODY } from '../../rig/constants';
import { createSkeleton } from '../../rig/skeleton';
import type { ArmPose, LegPose, Skeleton } from '../../rig/skeleton';
import type { RestPose, RestSide } from './skin/types';

function placeArm(pose: ArmPose, side: RestSide): void {
  pose.shoulder.fromArray(side.shoulder);
  pose.elbow.fromArray(side.elbow);
  pose.wrist.fromArray(side.wrist);
  pose.handAxis.fromArray(side.fingertip).sub(pose.wrist).normalize();
  pose.palm.fromArray(side.palm);
  pose.hand.copy(pose.wrist).addScaledVector(pose.handAxis, BODY.hand / 2);
}

function placeLeg(pose: LegPose, side: RestSide): void {
  pose.hip.fromArray(side.hip);
  pose.knee.fromArray(side.knee);
  pose.ankle.fromArray(side.ankle);
  pose.toe.fromArray(side.toeTip);
  pose.footAxis.copy(pose.toe).sub(pose.ankle).normalize();
  pose.sole.fromArray(side.sole);
}

export function restSkeleton(rest: RestPose): Skeleton {
  const skeleton = createSkeleton();
  (['right', 'left'] as const).forEach((id) => {
    placeArm(skeleton.arms[id], rest[id]);
    placeLeg(skeleton.legs[id], rest[id]);
  });
  skeleton.neck.fromArray(rest.neck);
  return skeleton;
}
