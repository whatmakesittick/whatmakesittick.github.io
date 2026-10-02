import { THEME as CORE_THEME } from '@core/theme';

export const THEME = {
  ...CORE_THEME,
  takeoff: '#ffb347',
  climb: '#ffd24c',
  handover: '#5fa8ff',
  loiter: '#6fd38a',
  strike: '#ff5d4c',
  return: '#b48cff',
  airframe: '#9da4ad',
  airframeDark: '#5f6670',
  sensorGlass: '#1d2b3a',
  fuel: '#f5a524',
  satLink: '#5fa8ff',
  losLink: '#6fd38a',
  laser: '#c6ffd9',
  infrared: '#ff9a3c',
  daylight: '#f4f7fb',
  plume: '#ffd9a0',
  sand: '#c7a16b',
  skyTop: '#1b2a4a',
  skyHorizon: '#f2a65a',
} as const;
