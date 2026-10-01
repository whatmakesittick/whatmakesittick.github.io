import type { PhaseId } from '../ids';

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  letGo: 'var(--let-go)',
  plunge: 'var(--plunge)',
  noOrbit: 'var(--no-orbit)',
  lightRing: 'var(--ring)',
  inside: 'var(--inside)',
};

export const NEUTRAL_TONE = 'var(--text)';
export const RING_TONE = 'var(--ring)';
export const RATIO_METER_FILL = 'var(--ring)';
export const DISTANCE_METER_FILL = 'var(--let-go)';
export const SPEED_METER_FILL = 'var(--plunge)';
export const TIDE_METER_FILL = 'var(--inside)';
