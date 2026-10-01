import { PHASE_IDS } from '../ids';
import type { PhaseId } from '../ids';
import { CLOCK_UNITS, CYCLE_UNITS } from './clock';

export interface PhaseRange {
  start: number;
  end: number;
}

export const PHASE_RANGES: Readonly<Record<PhaseId, PhaseRange>> = {
  strike: { start: 0, end: CLOCK_UNITS.strike },
  barrel: { start: CLOCK_UNITS.strike, end: CLOCK_UNITS.exit },
  unlock: { start: CLOCK_UNITS.exit, end: CLOCK_UNITS.unlocked },
  eject: { start: CLOCK_UNITS.unlocked, end: CLOCK_UNITS.rear },
  feed: { start: CLOCK_UNITS.rear, end: CLOCK_UNITS.locked },
  ready: { start: CLOCK_UNITS.locked, end: CYCLE_UNITS },
};

export function phaseIdAt(units: number): PhaseId {
  return PHASE_IDS.find((id) => units < PHASE_RANGES[id].end) ?? 'ready';
}
