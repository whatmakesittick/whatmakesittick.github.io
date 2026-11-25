import { Group } from 'three';
import type { Steps } from '@core/scene/pacing';
import type { GaitReading } from '../ids';
import { poseOf, solveSkeleton } from './rig/skeleton';
import type { RunnerPose } from './runnerPose';
import type { RunnerFigure } from './runnerSlot';

export function testPose(reading: GaitReading): RunnerPose {
  return poseOf(solveSkeleton(reading));
}

export function* buildTestRunner(): Steps<RunnerFigure> {
  yield;
  const root = new Group();
  return { root, apply: () => {}, dispose: () => root.removeFromParent() };
}
