import type { PhaseId } from '../ids';

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  start: 'var(--start)',
  liftoff: 'var(--liftoff)',
  climb: 'var(--climb)',
  maxQ: 'var(--maxq)',
  thinAir: 'var(--thin)',
  cutoff: 'var(--cutoff)',
};

export const NEUTRAL_TONE = 'var(--text)';
export const RUNNING_TONE = 'var(--flame)';
export const THRUST_METER_FILL = 'var(--flame)';
export const EFFICIENCY_METER_FILL = 'var(--thin)';
export const AIR_METER_FILL = 'var(--thin)';
export const ALTITUDE_METER_FILL = 'var(--climb)';
export const THROTTLE_METER_FILL = 'var(--liftoff)';
