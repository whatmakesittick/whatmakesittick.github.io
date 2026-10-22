import { THEME as CORE_THEME } from '@core/theme';
import type { PhaseId } from './ids';

export const THEME = {
  ...CORE_THEME,
  lift: '#9b7fe0',
  drive: '#f2a33a',
  cruise: '#3fc4dc',
  regen: '#5cc98a',
  rest: '#8a8f99',
  trainBody: '#f2eee5',
  trainBand: '#2b3644',
  concrete: '#a7a39a',
  stator: '#383f47',
  magnet: '#b8733a',
  guidanceRail: '#7c858f',
  phaseA: '#e5484d',
  phaseB: '#f5c63c',
  phaseC: '#3d8bf2',
  powered: '#a6e8ff',
  eddy: '#ff7a2f',
  ghost: '#bcd6f2',
  skid: '#55585e',
  sky: '#c8d5de',
  fog: '#d3dbe0',
  ground: '#7e8a5c',
  keyLight: '#ffe1b5',
  fillLight: '#b6c9ff',
  inset: '#10151b',
  insetLine: '#d8dee6',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  liftOff: THEME.lift,
  accelerate: THEME.drive,
  cruise: THEME.cruise,
  brake: THEME.regen,
  settle: THEME.rest,
};

export const WAVE_PHASE_COLOURS = [THEME.phaseA, THEME.phaseB, THEME.phaseC] as const;
