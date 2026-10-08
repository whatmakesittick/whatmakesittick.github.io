import { THEME as CORE_THEME } from '@core/theme';
import type { OperatingStateId, PhaseId } from './ids';

export const THEME = {
  ...CORE_THEME,
  night: '#3d5a99',
  morning: '#6fbf73',
  afternoon: '#f2b134',
  storm: '#e5534b',
  evening: '#9b7fd1',
  haze: '#cfdbe6',
  skyTop: '#7fa9d6',
  grass: '#8fae5d',
  grassDark: '#6f8f45',
  field: '#c9b876',
  trees: '#4f6b3a',
  gravel: '#bdb5a6',
  turbineWhite: '#eef0f2',
  turbineGrey: '#c9ced3',
  concrete: '#b9b6ae',
  castIron: '#5d6168',
  steel: '#8c939b',
  gearOil: '#c58b3a',
  copper: '#b87333',
  converterCabinet: '#d7dbe0',
  hydraulic: '#d9c23f',
  brakeGlow: '#ff6a3d',
  cooler: '#aeb6bd',
  wind: '#5fa8ff',
  wake: '#2f4f6f',
  cable: '#ffb347',
  gridLine: '#3a3f46',
  substation: '#9aa3ad',
  spacing: '#ffffff',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  night: THEME.night,
  morning: THEME.morning,
  afternoon: THEME.afternoon,
  storm: THEME.storm,
  evening: THEME.evening,
};

export const STATE_TONES: Readonly<Record<OperatingStateId, string>> = {
  idle: THEME.night,
  partial: THEME.morning,
  full: THEME.afternoon,
  rampDown: THEME.storm,
  stopping: THEME.storm,
  parked: THEME.castIron,
  starting: THEME.morning,
};
