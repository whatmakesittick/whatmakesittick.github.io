import type { PhaseId } from '../model';

export const PHASE_TONES: Record<PhaseId, string> = {
  deck: 'var(--deck)',
  sea: 'var(--sea)',
  topHole: 'var(--top-hole)',
  overburden: 'var(--overburden)',
  seal: 'var(--seal)',
  reservoir: 'var(--reservoir)',
  bottom: 'var(--bottom)',
};
