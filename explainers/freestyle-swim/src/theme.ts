import { THEME as CORE_THEME } from '@core/theme';
import type { PhaseId } from './ids';

export const THEME = {
  ...CORE_THEME,
  sceneBackground: '#0f1a24',
  water: '#2f8fb8',
  waterClear: '#a8dcf0',
  poolFloor: '#1d4a63',
  tileSeam: '#2c6a8a',
  laneLine: '#0b1822',
  floatA: '#f2f4f5',
  floatB: '#e0533d',
  skin: '#d9a98f',
  cap: '#e8b84a',
  goggles: '#1a2733',
  suit: '#2a3f55',
  rightSide: '#f0d9b5',
  forward: '#6fbf73',
  thrust: '#f28b3c',
  drag: '#e0533d',
  handPath: '#9fe3f5',
  splash: '#e9f6fb',
  entryCatch: '#6fa8e0',
  pull: '#3fbfae',
  push: '#e8b84a',
  recovery: '#9a8fc4',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  entryCatch: THEME.entryCatch,
  pull: THEME.pull,
  push: THEME.push,
  recovery: THEME.recovery,
};
