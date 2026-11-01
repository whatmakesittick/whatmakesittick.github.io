import { DEFAULT_SCHEME, isScheme } from './scheme';
import type { Scheme } from './scheme';

export type { Scheme } from './scheme';

export interface Theme {
  readonly background: string;
  readonly surface: string;
  readonly text: string;
  readonly muted: string;
  readonly accent: string;
  readonly metalLight: string;
  readonly metal: string;
  readonly metalDark: string;
  readonly highlight: string;
}

export const SCHEMES: Readonly<Record<Scheme, Theme>> = {
  dark: {
    background: '#1e1b17',
    surface: '#26231f',
    text: '#efe7d8',
    muted: '#a29a8b',
    accent: '#c9a24d',
    metalLight: '#bbbec3',
    metal: '#72777d',
    metalDark: '#3d4045',
    highlight: '#c9a24d',
  },
  light: {
    background: '#e8e6e1',
    surface: '#ffffff',
    text: '#1a1b1e',
    muted: '#6b6e75',
    accent: '#8e6612',
    metalLight: '#c3c6cc',
    metal: '#80858d',
    metalDark: '#4b4f57',
    highlight: '#b8902f',
  },
};

export function activeScheme(): Scheme {
  if (typeof document === 'undefined') return DEFAULT_SCHEME;
  const scheme = document.documentElement.dataset.theme;
  return isScheme(scheme) ? scheme : DEFAULT_SCHEME;
}

export const THEME: Theme = SCHEMES[activeScheme()];
