import type { GasPortId, MotionReading } from '../ids';
import { UNLOCK_ANGLE } from './layout';
import { CASE_GONE_MS, EJECT_MS, HAMMER_TIMES } from './motion';

export const HAMMER_STAGES = ['falling', 'struck', 'cocking', 'cocked', 'held'] as const;
export type HammerStage = (typeof HAMMER_STAGES)[number];

export const LOCK_STAGES = ['locked', 'turning', 'open'] as const;
export type LockStage = (typeof LOCK_STAGES)[number];

export const CASE_STAGES = ['held', 'flying', 'gone'] as const;
export type CaseStage = (typeof CASE_STAGES)[number];

export const ROUND_STAGES = ['waiting', 'feeding', 'chambered'] as const;
export type RoundStage = (typeof ROUND_STAGES)[number];

const SETTLED = 1e-6;
const CLOCK_ROUNDING_MS = 1e-9;

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

export function caseStage(ms: number, gasPort: GasPortId): CaseStage {
  if (gasPort === 'blocked' || ms < EJECT_MS - CLOCK_ROUNDING_MS) return 'held';
  if (ms < CASE_GONE_MS) return 'flying';
  return 'gone';
}

export function roundStage(motion: MotionReading): RoundStage {
  return stageOf(motion.feed, ROUND_STAGES);
}
