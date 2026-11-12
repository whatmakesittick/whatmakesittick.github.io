import { THEME as CORE_THEME, activeScheme } from '@core/theme';
import type { Scheme } from '@core/theme';
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

export interface BayTones {
  haze: string;
  sky: string;
  ground: string;
  floor: string;
  ceiling: string;
  wall: string;
  tool: string;
  pod: string;
  window: string;
  subfab: string;
  lamp: string;
  pool: string;
}

const SCHEME_BAY_TONES: Readonly<Record<Scheme, BayTones>> = {
  dark: {
    haze: '#7a5428',
    sky: '#241b12',
    ground: '#17120d',
    floor: '#352e27',
    ceiling: '#4f463b',
    wall: '#8a6c4b',
    tool: '#544b41',
    pod: '#d9d0bf',
    window: '#c98a3e',
    subfab: '#221e1b',
    lamp: '#ffb65a',
    pool: '#ffb54d',
  },
  light: {
    haze: '#efe6d6',
    sky: '#f4efe7',
    ground: '#d9d1c4',
    floor: '#d8d2c7',
    ceiling: '#eee9e1',
    wall: '#f1eadc',
    tool: '#d6cfc3',
    pod: '#f4efe6',
    window: '#b9a888',
    subfab: '#8f877c',
    lamp: '#ffe2a8',
    pool: '#ffc978',
  },
};

export const BAY_TONES: BayTones = SCHEME_BAY_TONES[activeScheme()];
