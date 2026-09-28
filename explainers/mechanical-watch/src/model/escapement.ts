import type { MomentId } from '../ids';
import { BEATS_PER_TOOTH, ESCAPE_TEETH } from './train';

export const TOOTH_PITCH_DEG = 360 / ESCAPE_TEETH;
export const ADVANCE_PER_BEAT_DEG = TOOTH_PITCH_DEG / BEATS_PER_TOOTH;
export const LIFT_ANGLE_DEG = 50;
export const TOTAL_FORK_ANGLE_DEG = 10;
export const LOCK_DEG = 1.5;
export const RUN_DEG = 0.25;
export const PALLET_SPAN_TEETH = 2.5;
export const PALLET_SPAN_DEG = PALLET_SPAN_TEETH * (360 / ESCAPE_TEETH);
export const DRAW_DEG = 12;
export const DROP_DEG = 1.5;
export const IMPULSE_DEG = ADVANCE_PER_BEAT_DEG - DROP_DEG;

export const BEAT_STAGES = {
  unlockEnd: 0.175,
  impulseEnd: 0.875,
  dropEnd: 0.95,
} as const;

export const MOMENT_PROGRESS: Readonly<Record<MomentId, number>> = {
  lock: -0.5,
  unlock: 0.08,
  impulse: 0.5,
  drop: 0.91,
  free: 1.6,
};

function ramp(progress: number, from: number, to: number): number {
  return (progress - from) / (to - from);
}

export function escapeAdvanceInBeat(progress: number): number {
  const { unlockEnd, impulseEnd, dropEnd } = BEAT_STAGES;
  if (progress <= unlockEnd) return 0;
  if (progress <= impulseEnd) return IMPULSE_DEG * ramp(progress, unlockEnd, impulseEnd);
  if (progress <= dropEnd) return IMPULSE_DEG + DROP_DEG * ramp(progress, impulseEnd, dropEnd);
  return ADVANCE_PER_BEAT_DEG;
}

export type BeatStage = 'locked' | 'unlocking' | 'impulse' | 'drop' | 'running';

export function beatStage(progress: number): BeatStage {
  const { unlockEnd, impulseEnd, dropEnd } = BEAT_STAGES;
  if (progress <= 0) return 'locked';
  if (progress <= unlockEnd) return 'unlocking';
  if (progress <= impulseEnd) return 'impulse';
  if (progress <= dropEnd) return 'drop';
  return progress >= 1 ? 'locked' : 'running';
}
