import { clamp, lerp, smoothstep } from '@core/math';
import { wrapPhase } from '@core/store';
import { STITCH_CYCLE } from './cycle';

export const STITCH_LENGTH = { min: 1, max: 5, step: 0.5, default: 2.5 } as const;

export const FEED_TIMING = {
  riseEnd: 8,
  pushEnd: 52,
  dropEnd: 60,
  returnStart: 320,
  returnEnd: 360,
} as const;

export const FEED_DOG_TIP = { raised: 1, lowered: -1.2 } as const;

const MILLIMETRES_PER_CENTIMETRE = 10;

export interface FeedDogPosition {
  lift: number;
  shift: number;
}

export function clampStitchLength(millimetres: number): number {
  return clamp(millimetres, STITCH_LENGTH.min, STITCH_LENGTH.max);
}

export function stitchesPerCm(stitchLength: number): number {
  return MILLIMETRES_PER_CENTIMETRE / stitchLength;
}

export function fabricTravel(angle: number, stitchLength: number): number {
  const { riseEnd, pushEnd } = FEED_TIMING;
  return stitchLength * smoothstep(wrapPhase(angle, STITCH_CYCLE), riseEnd, pushEnd);
}

function feedDogLift(angle: number): number {
  const { riseEnd, pushEnd, dropEnd } = FEED_TIMING;
  const { raised, lowered } = FEED_DOG_TIP;
  if (angle < riseEnd) return lerp(lowered, raised, smoothstep(angle, 0, riseEnd));
  if (angle < pushEnd) return raised;
  return lerp(raised, lowered, smoothstep(angle, pushEnd, dropEnd));
}

function feedDogShift(angle: number, stitchLength: number): number {
  const half = stitchLength / 2;
  const { returnStart, returnEnd } = FEED_TIMING;
  if (angle >= returnStart) return lerp(-half, half, smoothstep(angle, returnStart, returnEnd));
  return half - fabricTravel(angle, stitchLength);
}

export function feedDogPosition(angle: number, stitchLength: number): FeedDogPosition {
  const normalized = wrapPhase(angle, STITCH_CYCLE);
  return { lift: feedDogLift(normalized), shift: feedDogShift(normalized, stitchLength) };
}
