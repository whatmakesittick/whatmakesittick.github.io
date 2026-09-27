import { toRadians } from '@core/math';
import { wrapPhase } from '@core/store';
import { STITCH_CYCLE } from './cycle';

const NEEDLE_BAR = {
  crankRadius: 15,
  rodLength: 38,
} as const;

export const NEEDLE = {
  lowestTip: -12,
  eyeAboveTip: 2.5,
  scarfAboveEye: 2,
  radius: 0.6,
} as const;

const NEEDLE_STROKE = 2 * NEEDLE_BAR.crankRadius;

function needleBarDrop(angle: number): number {
  const { crankRadius, rodLength } = NEEDLE_BAR;
  const radians = toRadians(wrapPhase(angle, STITCH_CYCLE));
  const sine = crankRadius * Math.sin(radians);
  const rodShortfall = rodLength - Math.sqrt(rodLength * rodLength - sine * sine);
  return crankRadius * (1 - Math.cos(radians)) - rodShortfall;
}

export function needleTipHeight(angle: number): number {
  return NEEDLE.lowestTip + NEEDLE_STROKE - needleBarDrop(angle);
}

export function needleEyeHeight(angle: number): number {
  return needleTipHeight(angle) + NEEDLE.eyeAboveTip;
}
