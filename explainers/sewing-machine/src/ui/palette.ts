import type { PhaseId } from '../model';

export const PHASE_TONES: Record<PhaseId, string> = {
  feed: 'var(--feed)',
  pierce: 'var(--pierce)',
  loop: 'var(--loop)',
  wrap: 'var(--wrap)',
  set: 'var(--set)',
};

export const LOOP_METER_FILL = 'var(--top-thread)';
export const FEED_METER_FILL = 'var(--feed)';
