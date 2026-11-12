import { THEME as CORE_THEME } from '@core/theme';
import type { PhaseId } from './ids';

export const THEME = {
  ...CORE_THEME,
  tin: '#c3c8d0',
  laser: '#e8574a',
  plasma: '#c9a8ff',
  euv: '#6a7bff',
  wafer: '#8e98a3',
  floor: '#b9bcc0',
  hatch: '#3a3d42',
  machine: '#aeb8c4',
  shell: '#8896a6',
  mirror: '#9fb4d8',
  maskPlate: '#2b3340',
  fillLight: '#b9cbf5',
  keyLight: '#f3f1ea',
  inset: '#10151b',
  insetLine: '#d8dee6',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  droplet: THEME.tin,
  prepulse: THEME.laser,
  plasma: THEME.plasma,
  collect: THEME.euv,
  mask: THEME.euv,
  expose: THEME.wafer,
};
