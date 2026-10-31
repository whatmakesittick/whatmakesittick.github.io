import { THEME as CORE_THEME } from '@core/theme';
import type { PhaseId } from './ids';

export const THEME = {
  ...CORE_THEME,
  toneGrid: '#4c8df0',
  toneProtect: '#9a7ce6',
  toneDistribute: '#f0a43a',
  toneCompute: '#e5534b',
  toneCool: '#3ec2dc',
  toneRelease: '#3fb38f',
  current: '#ffb340',
  heat: '#ff5a3d',
  coolantSupply: '#3d8bf2',
  coolantReturn: '#e04a4a',
  packet: '#5ad68c',
  sky: '#c9d4dd',
  fog: '#d4dbe1',
  ground: '#7d8a5d',
  road: '#5d6166',
  concrete: '#a9a59d',
  steel: '#8d959e',
  rack: '#23272d',
  copper: '#c47a3c',
  statusLight: '#7ee0a2',
  keyLight: '#ffe6c4',
  fillLight: '#b9cbf5',
  inset: '#10151b',
  insetLine: '#d8dee6',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  grid: THEME.toneGrid,
  protect: THEME.toneProtect,
  distribute: THEME.toneDistribute,
  compute: THEME.toneCompute,
  cool: THEME.toneCool,
  release: THEME.toneRelease,
};
