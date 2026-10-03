import type { PhaseId } from '../ids';
import { THEME } from '../theme';

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  takeoff: THEME.takeoff,
  climb: THEME.climb,
  transit: THEME.transit,
  orbit: THEME.orbit,
  return: THEME.return,
  landing: THEME.landing,
};

export const BATTERY_METER_FILL = THEME.battery;
