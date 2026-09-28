import { THEME as CORE_THEME } from '@core/theme';

export const THEME = {
  ...CORE_THEME,
  lamp: '#f5c451',
  condenser: '#ff9f43',
  specimen: '#ff7eb6',
  objective: '#4cc3ff',
  tube: '#4fd1c5',
  eyepiece: '#c792ea',
  eye: '#8bd47f',
  slide: '#f3efe6',
  cytoplasm: 'rgba(126, 150, 214, 0.34)',
  membrane: 'rgba(78, 98, 170, 0.6)',
  nucleus: 'rgba(52, 60, 138, 0.9)',
  viewSurround: '#050607',
  viewRim: 'rgb(255 255 255 / 0.14)',
} as const;
