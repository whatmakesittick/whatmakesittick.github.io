import { THEME as CORE_THEME } from '@core/theme';
import type { PhaseId } from './ids';

export const THEME = {
  ...CORE_THEME,
  skyTop: '#5f86b8',
  skyHorizon: '#f6cf9f',
  haze: '#f1d3ab',
  sun: '#fff0cf',
  sea: '#2c6f86',
  seaGlitter: '#ffe9b8',
  road: '#4a4a4d',
  roadLine: '#ece6d6',
  kerb: '#8d8b86',
  wall: '#b9ad98',
  grass: '#6f8a4b',
  tree: '#3f5f3a',
  skin: '#c98f6b',
  singlet: '#e9e4d8',
  shorts: '#2d3b52',
  shoe: '#f2f0ea',
  rightAccent: '#e8663f',
  leftAccent: '#3f8fd1',
  forceArrow: '#f28b3c',
  bodyWeightArrow: '#8bd0e6',
  formLine: '#f2d24a',
  footPath: '#9fe3f5',
  shadow: '#1d1b22',
  landing: '#6fa8e0',
  pushOff: '#e8b84a',
  recovery: '#9a8fc4',
  reach: '#3fbfae',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  landing: THEME.landing,
  pushOff: THEME.pushOff,
  recovery: THEME.recovery,
  reach: THEME.reach,
};
