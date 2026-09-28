import type { MudState } from '../ids';
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

export const MUD_STATE_TONES: Record<MudState, string> = {
  safe: 'var(--text)',
  light: 'var(--danger)',
  heavy: 'var(--danger)',
};

export const PRESSURE_METER_FILL = 'var(--mud)';
