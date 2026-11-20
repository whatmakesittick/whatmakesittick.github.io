import { THEME as CORE_THEME } from '@core/theme';
import type { PhaseId } from './ids';
import type { ToneId } from './model/heat';

export const THEME = {
  ...CORE_THEME,
  sceneBackground: '#10151c',
  cool: '#8fd0f0',
  squeeze: '#e8c46a',
  fire: '#ff9a3c',
  ember: '#e0533d',
  exhaust: '#c9d3dc',
  nacelle: '#e9edf1',
  intakeLip: '#c8ced6',
  composite: '#2a2f36',
  linerCeramic: '#e6dccb',
  steel: '#9aa3ad',
  shaftOuter: '#b08a5a',
  shaftInner: '#6a8fb0',
  spinnerMark: '#ffffff',
  coldStream: '#7cc4ee',
  hotStream: '#ffb15c',
  flame: '#ffd9a0',
  person: '#d98c5f',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  suck: THEME.cool,
  squeeze: THEME.squeeze,
  burn: THEME.fire,
  spin: THEME.ember,
  blow: THEME.exhaust,
};

export const TONE_COLOURS: Readonly<Record<ToneId, string>> = {
  cool: THEME.cool,
  squeeze: THEME.squeeze,
  fire: THEME.fire,
  ember: THEME.ember,
  exhaust: THEME.exhaust,
};

export const HEAT_RAMP = { low: '#7a1f14', mid: '#e0532a', high: '#fff1d6' } as const;
