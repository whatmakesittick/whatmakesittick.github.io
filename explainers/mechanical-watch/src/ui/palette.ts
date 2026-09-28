import type { PhaseId } from '../ids';

export const PHASE_TONES: Record<PhaseId, string> = {
  swingIn: 'var(--swing)',
  tick: 'var(--tick)',
  swingOut: 'var(--swing-far)',
  swingBack: 'var(--swing)',
  tock: 'var(--tock)',
  swingHome: 'var(--swing-far)',
};

export const NEUTRAL_TONE = 'var(--text)';
export const CONTACT_TONE = 'var(--tick)';
export const GOOD_RATE_TONE = 'var(--good)';
export const WARN_RATE_TONE = 'var(--warn)';
export const AMPLITUDE_METER_FILL = 'var(--amber)';
export const RESERVE_METER_FILL = 'var(--brass)';
