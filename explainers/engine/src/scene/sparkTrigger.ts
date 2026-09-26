import { degreesForward, ignitionStart, isIgnitionActive } from '../model';
import type { EngineSpec } from '../model';
import { SPARK } from './constants';

export class SparkTrigger {
  private holdRemaining = 0;

  update(angle: number, deltaDegrees: number, deltaSeconds: number, spec: EngineSpec): number {
    if (spec.ignition !== 'spark') return 0;
    const previous = angle - deltaDegrees;
    const crossed =
      deltaDegrees > 0 && degreesForward(previous, ignitionStart(spec)) < deltaDegrees;
    if (crossed || isIgnitionActive(angle, spec)) this.holdRemaining = SPARK.holdSeconds;
    else this.holdRemaining = Math.max(0, this.holdRemaining - deltaSeconds);
    if (this.holdRemaining <= 0) return 0;
    return SPARK.flickerMin + (1 - SPARK.flickerMin) * Math.random();
  }
}
