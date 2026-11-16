import type { PhaseId, StepId, StepStateId } from '../ids';

type PhaseStates = Readonly<Record<PhaseId, StepStateId>>;

function states(
  pour: StepStateId,
  induction: StepStateId,
  exhaustion: StepStateId,
  iodine: StepStateId,
  complex: StepStateId,
  blue: StepStateId,
): PhaseStates {
  return { pour, induction, exhaustion, iodine, complex, blue };
}

export const STEP_STATES: Readonly<Record<StepId, PhaseStates>> = {
  landolt: states('running', 'running', 'running', 'finished', 'finished', 'finished'),
  dushman: states('waiting', 'running', 'running', 'running', 'running', 'running'),
  eaten: states('waiting', 'running', 'running', 'finished', 'finished', 'finished'),
  triiodide: states('waiting', 'waiting', 'waiting', 'running', 'running', 'running'),
  helix: states('waiting', 'waiting', 'waiting', 'waiting', 'running', 'running'),
};

export function stepStateAt(step: StepId, phase: PhaseId): StepStateId {
  return STEP_STATES[step][phase];
}
