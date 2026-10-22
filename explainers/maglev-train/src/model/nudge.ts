import { FULL_TURN, smoothstep } from '@core/math';
import type { NudgeId } from '../ids';

export interface NudgeOffset {
  verticalMm: number;
  lateralMm: number;
}

export const NUDGE_SETTLE_SECONDS = 1.5;
export const NUDGE_PEAK_MM = 2;

const WOBBLE_HZ = 2.5;
const DECAY_PER_SECOND = 3;
const ANGULAR_SPEED = FULL_TURN * WOBBLE_HZ;

const NUDGE_AXIS: Readonly<Record<NudgeId, keyof NudgeOffset>> = {
  bump: 'verticalMm',
  gust: 'lateralMm',
};

function dampedSwing(seconds: number): number {
  return Math.exp(-DECAY_PER_SECOND * seconds) * Math.sin(ANGULAR_SPEED * seconds);
}

const FIRST_PEAK_SECONDS = Math.atan(ANGULAR_SPEED / DECAY_PER_SECOND) / ANGULAR_SPEED;
const FIRST_PEAK_SWING = dampedSwing(FIRST_PEAK_SECONDS);

function settleTaper(seconds: number): number {
  return 1 - smoothstep(seconds, 0, NUDGE_SETTLE_SECONDS);
}

function isSettling(secondsSince: number): boolean {
  return secondsSince >= 0 && secondsSince < NUDGE_SETTLE_SECONDS;
}

function wobbleMm(secondsSince: number): number {
  if (!isSettling(secondsSince)) return 0;
  const swing = dampedSwing(secondsSince) / FIRST_PEAK_SWING;
  return NUDGE_PEAK_MM * swing * settleTaper(secondsSince);
}

export function nudgeResponse(secondsSince: number, id: NudgeId): NudgeOffset {
  return { verticalMm: 0, lateralMm: 0, [NUDGE_AXIS[id]]: wobbleMm(secondsSince) };
}
