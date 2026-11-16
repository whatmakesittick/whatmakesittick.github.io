import { THEME as CORE_THEME } from '@core/theme';
import type { ElementId, PhaseId } from './ids';

export const THEME = {
  ...CORE_THEME,
  sceneBackground: '#0e1320',
  pour: '#7fb2d9',
  induction: '#8f9bb3',
  exhaustion: '#e8c547',
  iodinePhase: '#b07ad9',
  complex: '#6f7fe8',
  blue: '#4a5bd1',
  iodineAtom: '#8a5cc7',
  oxygen: '#e0533d',
  sulfur: '#e8c547',
  hydrogen: '#e9eef2',
  amylose: '#d9c79a',
  clearLiquid: '#cfe3ee',
  blueBlack: '#141a3c',
} as const;

export const CLEAR_LIQUID_OPACITY = 0.15;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  pour: THEME.pour,
  induction: THEME.induction,
  exhaustion: THEME.exhaustion,
  iodine: THEME.iodinePhase,
  complex: THEME.complex,
  blue: THEME.blue,
};

export const ATOM_COLOURS: Readonly<Record<ElementId, string>> = {
  I: THEME.iodineAtom,
  S: THEME.sulfur,
  O: THEME.oxygen,
  H: THEME.hydrogen,
};

export const LIQUID_TINTS = {
  clear: THEME.clearLiquid,
  clearOpacity: CLEAR_LIQUID_OPACITY,
  dark: THEME.blueBlack,
} as const;
