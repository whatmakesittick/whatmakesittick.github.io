import type { PhaseId } from '../ids';
import { THEME } from '../theme';

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  takeoff: THEME.takeoff,
  climb: THEME.climb,
  handover: THEME.handover,
  loiter: THEME.loiter,
  strike: THEME.strike,
  return: THEME.return,
};

export const FUEL_METER_FILL = THEME.fuel;
