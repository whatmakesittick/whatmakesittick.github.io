import { SCHEMES, THEME as CORE_THEME, activeScheme } from '@core/theme';
import type { Scheme } from '@core/theme';

interface EngineColors {
  neutral: string;
  intake: string;
  air: string;
  compressed: string;
  burn: string;
  flame: string;
  exhaust: string;
}

const SCHEME_COLORS: Readonly<Record<Scheme, EngineColors>> = {
  dark: {
    neutral: SCHEMES.dark.metalLight,
    intake: '#6aa9c9',
    air: '#b4c9d6',
    compressed: '#9d8fd1',
    burn: '#d87a35',
    flame: '#e8c36a',
    exhaust: '#8c877d',
  },
  light: {
    neutral: SCHEMES.light.metal,
    intake: '#2a8fc4',
    air: '#7fa3b8',
    compressed: '#5b63c9',
    burn: '#d9531e',
    flame: '#b8860b',
    exhaust: '#7a7f87',
  },
};

export const THEME = { ...CORE_THEME, ...SCHEME_COLORS[activeScheme()] };
