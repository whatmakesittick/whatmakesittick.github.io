import { THEME as CORE_THEME } from '@core/theme';
import type { ClutchStateId, EngineStateId, PhaseId } from './ids';

export const THEME = {
  ...CORE_THEME,
  power: '#e5534b',
  exhaust: '#9b7fd1',
  scavenge: '#5fa8ff',
  compression: '#f2b134',
  housing: '#e07b2e',
  plastic: '#2f3237',
  barSteel: '#9aa1a8',
  chainSteel: '#c9ced3',
  cutterChrome: '#e3e7ea',
  depthGauge: '#7d848c',
  mixture: '#5fa8ff',
  burn: '#ff8a3d',
  exhaustGas: '#8a8f99',
  barOil: '#c58b3a',
  fuel: '#d9c23f',
  zone: '#e5534b',
  brake: '#ff6a3d',
  spark: '#fff2a8',
  wood: '#c8a273',
  bark: '#6b4f35',
  clutchOpen: '#8a8f99',
  clutchDriving: '#6fbf73',
  clutchSlipping: '#e5534b',
  starterRope: '#e8e2d0',
  flywheel: '#5d6168',
  magnet: '#b5483b',
  coil: '#3a3f46',
  primer: '#f2efe2',
  engineStopped: '#8a8f99',
  engineCranking: '#f2b134',
  engineFastIdle: '#e5534b',
  engineRunning: '#6fbf73',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  power: THEME.power,
  exhaust: THEME.exhaust,
  scavenge: THEME.scavenge,
  compression: THEME.compression,
};

export const CLUTCH_TONES: Readonly<Record<ClutchStateId, string>> = {
  open: THEME.clutchOpen,
  driving: THEME.clutchDriving,
  slipping: THEME.clutchSlipping,
};

export const ENGINE_TONES: Readonly<Record<EngineStateId, string>> = {
  stopped: THEME.engineStopped,
  cranking: THEME.engineCranking,
  fastIdle: THEME.engineFastIdle,
  running: THEME.engineRunning,
};
