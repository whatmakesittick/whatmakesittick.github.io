import type { FigureRig } from '@core/figure/body/figureRig';
import { poseOf } from '../../rig/skeleton';
import type { RunnerResources } from './load';
import { buildRunner } from './buildRunner';
import { SkeletonCache } from './skeletons';

export function runnerResources(rig: FigureRig): RunnerResources {
  const skeletons = new SkeletonCache();
  return {
    solvePose: (reading) => poseOf(skeletons.at(reading)),
    buildRunner: (context) => buildRunner(context, rig, skeletons),
  };
}
