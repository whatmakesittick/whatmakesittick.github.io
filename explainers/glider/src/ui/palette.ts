import type { PhaseId } from '../model';

export const PHASE_TONES: Record<PhaseId, string> = {
  thermal: 'var(--thermal)',
  glide: 'var(--glide)',
  ridge: 'var(--ridge)',
  wave: 'var(--wave)',
  final: 'var(--final)',
};

export type ClimbTendency = 'up' | 'level' | 'down';

export const CLIMB_TONES: Record<ClimbTendency, string> = {
  up: 'var(--rising)',
  level: 'var(--text)',
  down: 'var(--sinking)',
};

export const HEIGHT_METER_FILL = 'var(--glide)';
