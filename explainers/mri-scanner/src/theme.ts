import { THEME as CORE_THEME } from '@core/theme';
import type { GradientAxisId, PhaseId, TissueId } from './ids';

export const THEME = {
  ...CORE_THEME,
  rf: '#ffb347',
  gradX: '#ff7a59',
  gradY: '#6fd38a',
  gradZ: '#b48cff',
  echo: '#4fd1c5',
  rest: '#8b929c',
  cover: '#e8ecef',
  coverTrim: '#c8cdd2',
  vacuumVessel: '#9aa3ad',
  radiationShield: '#c9cfd6',
  helium: '#9fd8ff',
  winding: '#c8783c',
  shieldWinding: '#a9632f',
  shim: '#5a6068',
  boreLiner: '#f4f5f6',
  table: '#d8dce0',
  cradle: '#eef0f2',
  blanket: '#7fa7c9',
  skin: '#e0b69a',
  headCoil: '#f2f3f5',
  copper: '#b87333',
  copperDark: '#7a4a22',
  floor: '#d9d6cf',
  ceiling: '#cfd3d8',
  windowGlass: '#16222e',
  consoleGlow: '#3a5a7a',
  screenFrame: '#1b1d20',
  fieldLine: '#5fa8ff',
  fringe: '#ffd24c',
  mainField: '#5fa8ff',
  spinArrow: '#e6e9ee',
  netMagnet: '#ff5d73',
  slice: '#ffb347',
  fat: '#ffd27a',
  whiteMatter: '#f0ece4',
  greyMatter: '#a7a2b4',
  fluid: '#5fb8ff',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  excite: THEME.rf,
  encode: THEME.gradY,
  refocus: THEME.rf,
  echo: THEME.echo,
  recover: THEME.rest,
};

export const GRADIENT_TONES: Readonly<Record<GradientAxisId, string>> = {
  x: THEME.gradX,
  y: THEME.gradY,
  z: THEME.gradZ,
};

export const TISSUE_TONES: Readonly<Record<TissueId, string>> = {
  fat: THEME.fat,
  whiteMatter: THEME.whiteMatter,
  greyMatter: THEME.greyMatter,
  fluid: THEME.fluid,
};
