import { lerp, smoothstep } from '@core/math';
import type { GasId } from '../../../ids';
import { CORNER_NOZZLE_MAX_N } from '../../../model/constants';
import {
  PLUME,
  PLUME_LENGTH_AT_MAX_THRUST_M,
  PLUME_LENGTH_SCALE,
  PLUME_WAKE_SHARE,
} from './constants';
import type { PlumeLook } from './constants';

export interface PuffShape {
  distance: number;
  radius: number;
  diameter: number;
  alpha: number;
}

export function plumeLength(thrust: number, gas: GasId): number {
  const share = Math.max(thrust, 0) / CORNER_NOZZLE_MAX_N;
  return PLUME_LENGTH_AT_MAX_THRUST_M * share * PLUME_LENGTH_SCALE[gas];
}

export function plumeReach(length: number): number {
  return length * PLUME_WAKE_SHARE;
}

export function puffDistance(progress: number, length: number): number {
  return plumeReach(length) * (1 - (1 - progress) ** PLUME.drift);
}

function columnOpacity(distance: number, length: number, look: PlumeLook): number {
  const thinning = smoothstep(distance, length * PLUME.coreHold, length);
  const dispersal = 1 - smoothstep(distance, length, plumeReach(length));
  const mouth = lerp(PLUME.mouthFloor, 1, smoothstep(distance, 0, length * PLUME.fadeInShare));
  return mouth * lerp(look.coreOpacity, look.wakeOpacity, thinning) * dispersal;
}

function stackedAlpha(column: number, diameter: number, length: number): number {
  const overlap = Math.max(1, (PLUME.puffs * diameter) / plumeReach(length));
  return Math.min(1, (1 - (1 - column) ** (1 / overlap)) / PLUME.textureFill);
}

export function puffShape(
  progress: number,
  length: number,
  look: PlumeLook,
  target: PuffShape,
): PuffShape {
  const distance = puffDistance(progress, length);
  const beyond = Math.max(0, distance - length);
  target.distance = distance;
  target.radius = PLUME.mouthRadius + look.spread * distance + look.wakeSpread * beyond;
  target.diameter =
    (PLUME.mouthDiameter + PLUME.growth * distance + PLUME.wakeGrowth * beyond) * look.scale;
  target.alpha =
    length > 0 ? stackedAlpha(columnOpacity(distance, length, look), target.diameter, length) : 0;
  return target;
}
