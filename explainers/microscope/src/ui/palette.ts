import type { PhaseId } from '../model';

export const PHASE_TONES: Record<PhaseId, string> = {
  lamp: 'var(--lamp)',
  condenser: 'var(--condenser)',
  specimen: 'var(--specimen)',
  objective: 'var(--objective)',
  tube: 'var(--tube)',
  eyepiece: 'var(--eyepiece)',
  eye: 'var(--eye)',
};

export const RESOLUTION_METER_FILL = 'var(--objective)';
