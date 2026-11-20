import type { PaceId } from '../../../ids';
import { CYCLE_UNITS, cycleSeconds } from '../../../model';

const MAX_STEP_UNITS = 250;

export interface ClockStep {
  readonly seconds: number;
  readonly scrubbed: boolean;
}

export class EffectClock {
  private last: number | null = null;

  step(units: number, playing: boolean, pace: PaceId): ClockStep {
    const previous = this.last ?? units;
    this.last = units;
    let delta = units - previous;
    if (delta < -CYCLE_UNITS / 2) delta += CYCLE_UNITS;
    if (delta === 0) return { seconds: 0, scrubbed: false };
    if (!playing || delta < 0 || delta > MAX_STEP_UNITS) return { seconds: 0, scrubbed: true };
    return { seconds: (delta * cycleSeconds(pace)) / CYCLE_UNITS, scrubbed: false };
  }
}
