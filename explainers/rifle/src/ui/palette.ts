import type { PhaseId } from '../ids';

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  strike: 'var(--strike)',
  barrel: 'var(--barrel)',
  unlock: 'var(--unlock)',
  eject: 'var(--eject)',
  feed: 'var(--feed)',
  ready: 'var(--ready)',
};

export const PRESSURE_METER_FILL = 'var(--pressure)';
export const SPEED_METER_FILL = 'var(--copper)';
export const CARRIER_METER_FILL = 'var(--eject)';
