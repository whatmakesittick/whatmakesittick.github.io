import type { GaitReading } from '../../../ids';
import { solveSkeleton } from '../../rig/skeleton';
import type { RunnerSkeleton } from '../../rig/skeleton';

export class SkeletonCache {
  private reading: GaitReading | null = null;
  private skeleton: RunnerSkeleton | null = null;

  at(reading: GaitReading): RunnerSkeleton {
    if (!this.skeleton || reading !== this.reading) {
      this.skeleton = solveSkeleton(reading);
      this.reading = reading;
    }
    return this.skeleton;
  }
}
