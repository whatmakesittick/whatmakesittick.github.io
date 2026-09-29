import { PHASE_IDS } from '../ids';
import type { MomentId, PhaseId } from '../ids';
import { CUTOFF_TIME, MAX_Q_TIME, RUN_LENGTH, START_LEAD, phaseAt } from './flight';

export interface PhaseRange {
  start: number;
  end: number;
}

const CLIMB_START = 23;
const MAX_Q_START = 45;
const THIN_AIR_START = 71;
const CUTOFF_START = 133;
const CUTOFF_MOMENT_LEAD = 4;

export const PHASE_RANGES: Readonly<Record<PhaseId, PhaseRange>> = {
  start: { start: 0, end: START_LEAD },
  liftoff: { start: START_LEAD, end: CLIMB_START },
  climb: { start: CLIMB_START, end: MAX_Q_START },
  maxQ: { start: MAX_Q_START, end: THIN_AIR_START },
  thinAir: { start: THIN_AIR_START, end: CUTOFF_START },
  cutoff: { start: CUTOFF_START, end: RUN_LENGTH },
};

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  liftoff: START_LEAD,
  maxQ: phaseAt(MAX_Q_TIME),
  cutoff: phaseAt(CUTOFF_TIME - CUTOFF_MOMENT_LEAD),
};

export function phaseIdAt(phase: number): PhaseId {
  return PHASE_IDS.find((id) => phase < PHASE_RANGES[id].end) ?? 'cutoff';
}
