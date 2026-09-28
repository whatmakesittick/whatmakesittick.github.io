import { PHASE_IDS } from '../ids';
import type { PhaseId } from '../ids';
import { STEP_DEG, stepIndex } from './rotor';

export interface PhaseRange {
  readonly start: number;
  readonly end: number;
}

export function phaseAt(rotorDeg: number): PhaseId {
  return PHASE_IDS[stepIndex(rotorDeg)];
}

export function phaseRange(phase: PhaseId): PhaseRange {
  const start = PHASE_IDS.indexOf(phase) * STEP_DEG;
  return { start, end: start + STEP_DEG };
}
