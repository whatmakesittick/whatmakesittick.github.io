import type { PhaseId } from '../ids';

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  atria: 'var(--atria)',
  squeeze: 'var(--squeeze)',
  eject: 'var(--eject)',
  relax: 'var(--relax)',
  fill: 'var(--filling)',
  rest: 'var(--rest)',
};

export const NEUTRAL_TONE = 'var(--text)';
export const EJECTING_TONE = 'var(--eject)';
export const VENTRICLE_PRESSURE_METER_FILL = 'var(--eject)';
export const AORTIC_PRESSURE_METER_FILL = 'var(--arterial)';
export const VOLUME_METER_FILL = 'var(--filling)';
