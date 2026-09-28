import { smoothstep } from '@core/math';
import { OXYGEN_FORM } from '../constants';
import { copyPoint, hide, setLerp } from './points';
import type { GlyphPose } from './molecules';

export interface OxygenPose {
  readonly pair: GlyphPose;
  readonly waters: readonly [GlyphPose, GlyphPose];
}

function arriving(progress: number, pose: OxygenPose): void {
  const { entry, dock, arriveEnd, appearShare, tumble } = OXYGEN_FORM;
  const travel = smoothstep(progress, 0, arriveEnd);
  setLerp(pose.pair.position, entry, dock, travel);
  pose.pair.scale = smoothstep(progress, 0, appearShare);
  pose.pair.turn = (1 - travel) * tumble;
}

function docked(pose: OxygenPose): void {
  copyPoint(pose.pair.position, OXYGEN_FORM.dock);
  pose.pair.scale = 1;
  pose.pair.turn = 0;
}

function leaving(progress: number, pose: OxygenPose): void {
  const { dock, exits, splitAt, fadeFrom, tumble } = OXYGEN_FORM;
  const travel = smoothstep(progress, splitAt, 1);
  for (let index = 0; index < pose.waters.length; index += 1) {
    const water = pose.waters[index];
    setLerp(water.position, dock, exits[index], travel);
    water.scale = 1 - smoothstep(progress, fadeFrom, 1);
    water.turn = travel * tumble;
  }
}

export function poseOxygen(progress: number | null, pose: OxygenPose): OxygenPose {
  hide(pose.pair);
  hide(pose.waters[0]);
  hide(pose.waters[1]);
  if (progress === null) return pose;
  if (progress < OXYGEN_FORM.arriveEnd) arriving(progress, pose);
  else if (progress < OXYGEN_FORM.splitAt) docked(pose);
  else leaving(progress, pose);
  return pose;
}
