import type { HullMode, PhaseId } from '../ids';
import { THEME } from '../theme';

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  launch: THEME.launch,
  hump: THEME.hump,
  cruise: THEME.cruise,
  sprint: THEME.sprint,
  arrival: THEME.arrival,
};

export const MODE_TONES: Readonly<Record<HullMode, string>> = {
  floating: THEME.floating,
  hump: THEME.hump,
  planing: THEME.planing,
};
