import { CONDUCTION_TIMING, wrapTime } from '../../model';
import type { ConductionId } from '../../ids';

export interface PulseShape {
  readonly riseMs: number;
  readonly fadeMs: number;
  readonly rest: number;
}

export function pulseLevel(structure: ConductionId, time: number, shape: PulseShape): number {
  const local = wrapTime(time);
  const { start, end } = CONDUCTION_TIMING[structure];
  if (local < start - shape.riseMs) return shape.rest;
  if (local < start)
    return shape.rest + (1 - shape.rest) * ((local - start + shape.riseMs) / shape.riseMs);
  if (local <= end) return 1;
  return shape.rest + (1 - shape.rest) * Math.exp(-(local - end) / shape.fadeMs);
}

export function strongest(
  structures: readonly ConductionId[],
  time: number,
  shape: PulseShape,
): number {
  return Math.max(...structures.map((structure) => pulseLevel(structure, time, shape)));
}
