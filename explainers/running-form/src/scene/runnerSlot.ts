import { Group } from 'three';
import type { Object3D } from 'three';
import type { Steps } from '@core/scene/pacing';
import type { GaitReading } from '../ids';
import type { PartContext } from './parts/context';
import type { RunnerPose } from './runnerPose';

export interface RunnerFigure {
  readonly root: Object3D;
  apply(pose: RunnerPose, reading: GaitReading): void;
  dispose(): void;
}

export type PoseSolver = (reading: GaitReading) => RunnerPose;

export type RunnerBuilder = (context: PartContext) => Steps<RunnerFigure>;

class EmptyRunner implements RunnerFigure {
  readonly root = new Group();

  apply(): void {}

  dispose(): void {
    this.root.removeFromParent();
  }
}

export function* buildEmptyRunner(): Steps<RunnerFigure> {
  yield;
  return new EmptyRunner();
}
