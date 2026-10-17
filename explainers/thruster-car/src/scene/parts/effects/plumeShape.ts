import { lerp, smoothstep } from '@core/math';
import type { GasId, NozzlePartId } from '../../../ids';
import { CORNER_NOZZLE_MAX_N } from '../../../model/constants';
import {
  PLUME,
  PLUME_LENGTH_AT_MAX_THRUST_M,
  PLUME_LENGTH_SCALE,
  PLUME_WAKE_SHARE,
} from './constants';
import type { PlumeLook } from './constants';

export interface PlumeSpan {
  length: number;
  reach: number;
  puffs: number;
}

export interface PuffShape {
  distance: number;
  radius: number;
  diameter: number;
  rise: number;
  alpha: number;
}

export function plumeLength(thrust: number, gas: GasId): number {
  const share = Math.max(thrust, 0) / CORNER_NOZZLE_MAX_N;
  return PLUME_LENGTH_AT_MAX_THRUST_M * share * PLUME_LENGTH_SCALE[gas];
}

export function plumeReach(length: number, group: NozzlePartId): number {
  return length * PLUME_WAKE_SHARE[group];
}

export function puffDistance(progress: number, span: PlumeSpan): number {
  return span.reach * (1 - (1 - progress) ** PLUME.drift);
}

function wakeShare(distance: number, span: PlumeSpan): number {
  const wake = span.reach - span.length;
  return wake > 0 ? Math.max(0, distance - span.length) / wake : 0;
}

function columnOpacity(distance: number, span: PlumeSpan, look: PlumeLook): number {
  const { length } = span;
  const thinning = smoothstep(distance, length * PLUME.coreHold, length);
  const dispersal = 1 - smoothstep(wakeShare(distance, span), PLUME.wakeHold, 1);
  const mouth = lerp(PLUME.mouthFloor, 1, smoothstep(distance, 0, length * PLUME.fadeInShare));
  return mouth * lerp(look.coreOpacity, look.wakeOpacity, thinning) * dispersal;
}

function puffsPerMetre(progress: number, span: PlumeSpan): number {
  const pace = Math.max((1 - progress) ** (PLUME.drift - 1), PLUME.slowest);
  return span.puffs / (span.reach * PLUME.drift * pace);
}

function stackedAlpha(column: number, diameter: number, progress: number, span: PlumeSpan): number {
  const overlap = Math.max(1, puffsPerMetre(progress, span) * diameter);
  return Math.min(1, (1 - (1 - column) ** (1 / overlap)) / PLUME.textureFill);
}

export function puffShape(
  progress: number,
  span: PlumeSpan,
  look: PlumeLook,
  target: PuffShape,
): PuffShape {
  const distance = puffDistance(progress, span);
  const beyond = Math.max(0, distance - span.length);
  const wake = wakeShare(distance, span);
  target.distance = distance;
  target.radius = PLUME.mouthRadius + look.spread * distance + look.wakeSpread * beyond;
  const growth = PLUME.mouthDiameter + PLUME.growth * distance + PLUME.wakeGrowth * beyond;
  target.diameter = Math.min(growth, PLUME.maxDiameter) * look.scale;
  target.rise = PLUME.rise * (span.reach - span.length) * wake * wake;
  const column = span.length > 0 ? columnOpacity(distance, span, look) : 0;
  target.alpha = column > 0 ? stackedAlpha(column, target.diameter, progress, span) : 0;
  return target;
}
