import type { PhaseId } from '../model';

export const PHASE_TONES: Record<PhaseId, string> = {
  thermal: 'var(--thermal)',
  glide: 'var(--glide)',
  ridge: 'var(--ridge)',
  wave: 'var(--wave)',
  final: 'var(--final)',
};
