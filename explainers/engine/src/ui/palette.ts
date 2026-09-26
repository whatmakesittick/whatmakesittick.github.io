import type { EngineType, Stroke } from '../model';
import { THEME } from '../theme';

export const STROKE_COLORS: Record<Stroke, string> = {
  intake: THEME.intake,
  compression: THEME.compressed,
  power: THEME.burn,
  exhaust: THEME.exhaust,
};

export const VALVE_COLORS = {
  intake: THEME.intake,
  exhaust: THEME.metalLight,
} as const;

export const ENGINE_COLORS: Record<EngineType, string> = {
  petrol: THEME.accent,
  diesel: THEME.air,
};

export const IGNITION_COLOR = THEME.flame;

export const STROKE_TONES: Record<Stroke, string> = {
  intake: 'var(--stroke-intake)',
  compression: 'var(--stroke-compression)',
  power: 'var(--stroke-power)',
  exhaust: 'var(--stroke-exhaust)',
};

export const PRESSURE_METER_FILL =
  'linear-gradient(90deg, var(--compressed), var(--burn) 70%, var(--flame))';
