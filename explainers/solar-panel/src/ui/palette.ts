import type { PhaseId } from '../ids';

export const PHASE_TONES: Record<PhaseId, string> = {
  dawn: 'var(--dawn)',
  morning: 'var(--morning)',
  noon: 'var(--noon)',
  afternoon: 'var(--afternoon)',
  dusk: 'var(--dusk)',
};

export const NEUTRAL_TONE = 'var(--text)';
export const LOW_SUN_TONE = 'var(--dawn)';
export const HIGH_SUN_TONE = 'var(--noon)';
export const HOT_CELL_TONE = 'var(--warn)';
export const IRRADIANCE_METER_FILL = 'var(--noon)';
export const POWER_METER_FILL = 'var(--sun)';
