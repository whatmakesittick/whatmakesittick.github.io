import { THEME as CORE_THEME } from '@core/theme';
import type { ClutchStateId, PhaseId } from './ids';

export const THEME = {
  ...CORE_THEME,
  power: '#e5534b',
  exhaust: '#9b7fd1',
  scavenge: '#5fa8ff',
  compression: '#f2b134',
  housing: '#e07b2e',
  plastic: '#2f3237',
  barSteel: '#9aa1a8',
  chainSteel: '#c9ced3',
  cutterChrome: '#e3e7ea',
  depthGauge: '#7d848c',
  mixture: '#5fa8ff',
  burn: '#ff8a3d',
  exhaustGas: '#8a8f99',
  barOil: '#c58b3a',
  fuel: '#d9c23f',
  zone: '#e5534b',
  brake: '#ff6a3d',
  spark: '#fff2a8',
  wood: '#c8a273',
  bark: '#6b4f35',
  clutchOpen: '#8a8f99',
  clutchDriving: '#6fbf73',
  clutchSlipping: '#e5534b',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  power: THEME.power,
  exhaust: THEME.exhaust,
  scavenge: THEME.scavenge,
  compression: THEME.compression,
};

export const CLUTCH_TONES: Readonly<Record<ClutchStateId, string>> = {
  open: THEME.clutchOpen,
  driving: THEME.clutchDriving,
  slipping: THEME.clutchSlipping,
};
