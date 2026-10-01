import type { GasPortId, MotionReading } from '../ids';
import { UNLOCK_ANGLE } from './layout';
import { HAMMER_TIMES } from './motion';

export const HAMMER_STAGES = ['falling', 'struck', 'cocking', 'cocked', 'held'] as const;
export type HammerStage = (typeof HAMMER_STAGES)[number];

export const LOCK_STAGES = ['locked', 'turning', 'open'] as const;
export type LockStage = (typeof LOCK_STAGES)[number];

export const CASE_STAGES = ['held', 'flying', 'gone'] as const;
export type CaseStage = (typeof CASE_STAGES)[number];

export const ROUND_STAGES = ['waiting', 'feeding', 'chambered'] as const;
export type RoundStage = (typeof ROUND_STAGES)[number];

const SETTLED = 1e-6;

function stageOf<T>(share: number, [before, during, after]: readonly [T, T, T]): T {
  if (share <= SETTLED) return before;
  if (share >= 1 - SETTLED) return after;
  return during;
}

export function hammerStage(ms: number, gasPort: GasPortId): HammerStage {
  if (ms < HAMMER_TIMES.struck) return 'falling';
  if (gasPort === 'blocked' || ms < HAMMER_TIMES.cockStart) return 'struck';
  if (ms < HAMMER_TIMES.cocked) return 'cocking';
  if (ms < HAMMER_TIMES.released) return 'cocked';
  if (ms < HAMMER_TIMES.caught) return 'falling';
  return 'held';
}

export function lockStage(motion: MotionReading): LockStage {
  return stageOf(Math.abs(motion.bolt) / UNLOCK_ANGLE, LOCK_STAGES);
}

export function caseStage(motion: MotionReading): CaseStage {
  return stageOf(motion.caseFlight, CASE_STAGES);
}

export function roundStage(motion: MotionReading): RoundStage {
  return stageOf(motion.feed, ROUND_STAGES);
}
