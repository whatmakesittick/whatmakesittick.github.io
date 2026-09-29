import { withAlpha } from '@core/color';
import type { PhaseId } from '../ids';
import { THEME } from '../theme';

const BOX_FILL_ALPHA = 0.22;
const SPEED_ALPHA = 0.7;
const WHITE = '#ffffff';

export const PHASE_COLORS: Readonly<Record<PhaseId, string>> = {
  start: THEME.start,
  liftoff: THEME.liftoff,
  climb: THEME.climb,
  maxQ: THEME.maxq,
  thinAir: THEME.thin,
  cutoff: THEME.cutoff,
};

export const CANVAS_COLORS = {
  backdrop: THEME.background,
  grid: 'rgb(255 255 255 / 0.06)',
  axis: 'rgb(255 255 255 / 0.22)',
  tick: THEME.muted,
  lit: THEME.text,
  cursor: 'rgb(255 255 255 / 0.55)',
  thrust: THEME.flame,
  height: THEME.thin,
  speed: withAlpha(WHITE, SPEED_ALPHA),
  oxygen: THEME.liquidOxygen,
  fuel: THEME.liquidMethane,
  oxygenRichGas: THEME.oxygenRichGas,
  fuelRichGas: THEME.methaneRichGas,
  pump: THEME.liquidMethane,
  pumpFill: withAlpha(THEME.liquidMethane, BOX_FILL_ALPHA),
  burner: THEME.flame,
  burnerFill: withAlpha(THEME.flame, BOX_FILL_ALPHA),
  turbine: THEME.steel,
  turbineFill: withAlpha(THEME.steel, BOX_FILL_ALPHA),
  chamber: THEME.hotWall,
  chamberFill: withAlpha(THEME.hotWall, BOX_FILL_ALPHA),
  oxygenTankFill: withAlpha(THEME.liquidOxygen, BOX_FILL_ALPHA),
  fuelTankFill: withAlpha(THEME.liquidMethane, BOX_FILL_ALPHA),
  shaft: THEME.darkSteel,
  overboard: THEME.maxq,
} as const;
