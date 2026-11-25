import type { Object3D } from 'three';
import type { Steps } from '@core/scene/pacing';
import type { GaitReading } from '../ids';
import type { PartContext } from './parts/context';
import type { RunnerPose } from './runnerPose';

export interface RunnerFigure {
  readonly root: Object3D;
  apply(reading: GaitReading): void;
  dispose(): void;
}

export type PoseSolver = (reading: GaitReading) => RunnerPose;

export type RunnerBuilder = (context: PartContext) => Steps<RunnerFigure>;
