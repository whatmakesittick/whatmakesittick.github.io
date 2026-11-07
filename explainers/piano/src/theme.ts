import { THEME as CORE_THEME } from '@core/theme';
import type { PhaseId } from './ids';

export const THEME = {
  ...CORE_THEME,
  press: '#d9a441',
  escape: '#9b7fe0',
  strike: '#e5604d',
  check: '#4fb8c9',
  release: '#8a8f99',
  caseBlack: '#101114',
  plateGold: '#c8a052',
  steel: '#cfd4db',
  copper: '#b86b3c',
  spruce: '#e9d5ad',
  rib: '#cfb487',
  bridgeWood: '#6b4630',
  felt: '#ede7da',
  cloth: '#a32a3c',
  keyWood: '#d8c29b',
  ivory: '#f3eee2',
  ebony: '#17181c',
  brass: '#c9a35a',
  ghost: '#bcd6f2',
  section: '#c9b08a',
  glass: '#9fb4c8',
  stage: '#16130f',
  spot: '#f1d6a4',
  inset: '#101318',
  insetLine: '#d8dee6',
  keyLight: '#ffe4bd',
  fillLight: '#a3b6ff',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  press: THEME.press,
  escape: THEME.escape,
  strike: THEME.strike,
  check: THEME.check,
  release: THEME.release,
};
