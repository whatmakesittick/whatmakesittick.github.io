import { THEME as CORE_THEME } from '@core/theme';

export const THEME = {
  ...CORE_THEME,
  intake: '#4cc3ff',
  air: '#b9d7e8',
  compressed: '#7fa7ff',
  burn: '#ff7a1a',
  flame: '#ffd166',
  exhaust: '#7a7f87',
} as const;
