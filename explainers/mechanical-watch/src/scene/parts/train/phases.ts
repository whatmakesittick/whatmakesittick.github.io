import type { WheelId } from '../../../ids';
import { WHEEL_CENTRES } from '../../../model/layout';
import type { Point } from '../../../model/layout';
import { TRAIN } from '../../../model/train';
import { meshPhase } from '../../geometry/meshing';

export interface WheelPhase {
  readonly wheel: number;
  readonly pinion: number;
}

function direction(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function trainPhases(): Readonly<Record<WheelId, WheelPhase>> {
  const phases: Partial<Record<WheelId, { wheel: number; pinion: number }>> = {};
  TRAIN.forEach((spec) => (phases[spec.id] = { wheel: 0, pinion: 0 }));
  for (let index = 0; index < TRAIN.length - 1; index += 1) {
    const driver = TRAIN[index];
    const driven = TRAIN[index + 1];
    const angle = direction(WHEEL_CENTRES[driver.id], WHEEL_CENTRES[driven.id]);
    const phase = meshPhase(driven.pinionLeaves, angle);
    const driverPhase = phases[driver.id];
    const drivenPhase = phases[driven.id];
    if (driverPhase) driverPhase.wheel = phase.driver;
    if (drivenPhase) drivenPhase.pinion = phase.driven;
  }
  return phases as Record<WheelId, WheelPhase>;
}
