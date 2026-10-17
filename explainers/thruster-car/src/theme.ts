import { THEME as CORE_THEME } from '@core/theme';
import type { GasId, PhaseId } from './ids';

export const THEME = {
  ...CORE_THEME,
  boost: '#f2b134',
  ramp: '#5fa8ff',
  launch: '#9b7fd1',
  flip: '#e5534b',
  catch: '#6fbf73',
  rest: '#8a8f99',
  carBody: '#9aa0a8',
  carTrim: '#2f3237',
  tyre: '#1b1c1f',
  tankShell: '#141519',
  nozzleBody: '#26292e',
  plumeAir: '#f4f6f8',
  plumeHelium: '#cfe6ff',
  fanGlow: '#4da3ff',
  pressure: '#5fa8ff',
  empty: '#e5534b',
  weight: '#f2b134',
  netThrust: '#6fbf73',
  rampSteel: '#6f7782',
  concrete: '#7c766f',
  paint: '#e9e7e1',
  cone: '#f07a2a',
  scrub: '#2b2822',
  skyZenith: '#2c2550',
  skyMiddle: '#7a4a78',
  skyHorizon: '#f0915a',
  fog: '#6e4f66',
  keyLight: '#ffb37a',
  fillLight: '#8fa6ff',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  boost: THEME.boost,
  ramp: THEME.ramp,
  launch: THEME.launch,
  flip: THEME.flip,
  catch: THEME.catch,
  rest: THEME.rest,
};

export const PLUME_COLOURS: Readonly<Record<GasId, string>> = {
  air: THEME.plumeAir,
  nitrogen: THEME.plumeAir,
  helium: THEME.plumeHelium,
};
