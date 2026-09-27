import { lerp, smoothstep } from '@core/math';
import { wrapPhase } from '@core/store';
import { STITCH_CYCLE } from './cycle';

const TAKE_UP_TIMING = {
  dwellEnd: 20,
  lowest: 200,
  riseStart: 320,
  top: 360,
} as const;

export function takeUpLift(angle: number): number {
  const normalized = wrapPhase(angle, STITCH_CYCLE);
  const { dwellEnd, lowest, riseStart, top } = TAKE_UP_TIMING;
  if (normalized >= riseStart) return smoothstep(normalized, riseStart, top);
  return lerp(1, 0, smoothstep(normalized, dwellEnd, lowest));
}
