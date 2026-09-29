import { THEME as CORE_THEME } from '@core/theme';

export const THEME = {
  ...CORE_THEME,
  start: '#9aa7ff',
  liftoff: '#ffb347',
  climb: '#ff8a4c',
  maxq: '#ff5d73',
  thin: '#6fb6ff',
  cutoff: '#b48cff',
  liquidOxygen: '#a8ecff',
  liquidMethane: '#4f8dff',
  oxygenRichGas: '#ffae42',
  methaneRichGas: '#ff5fa2',
  flame: '#ff9b3d',
  flameCore: '#fff3d6',
  plume: '#8fb4ff',
  diamond: '#fff0c2',
  steel: '#b9bcc2',
  darkSteel: '#5a5f69',
  hotWall: '#c8643a',
  booster: '#d9dadc',
} as const;
