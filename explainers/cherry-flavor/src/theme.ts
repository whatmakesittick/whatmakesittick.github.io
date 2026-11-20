import { THEME as CORE_THEME } from '@core/theme';
import type { ElementId, OdorantId, PhaseId } from './ids';

export const THEME = {
  ...CORE_THEME,
  sceneBackground: '#1c1520',
  frost: '#9cc9e6',
  tonguePhase: '#e07b8a',
  cream: '#f0d9b5',
  air: '#b6a8e8',
  firing: '#e8b84a',
  cherry: '#c0304a',
  skin: '#e7b9a0',
  innerMouth: '#d9737f',
  palate: '#e8a3a8',
  cavityAir: '#3a2a40',
  iceCream: '#f2c6d0',
  cherryBits: '#9c1e3a',
  ice: '#dff1fb',
  fat: '#f5ecd2',
  benzaldehyde: '#d9a441',
  hexenal: '#6fbf73',
  linalool: '#c58be0',
  eugenol: '#a0643a',
  ionone: '#7b6fd6',
  carbon: '#4a4f57',
  oxygen: '#e0533d',
  hydrogen: '#e9eef2',
  sweetGlow: '#f28bb0',
  sourGlow: '#f2d14a',
  coldGlow: '#a8dcf5',
} as const;

export const PHASE_TONES: Readonly<Record<PhaseId, string>> = {
  spoon: THEME.frost,
  tongue: THEME.tonguePhase,
  melting: THEME.cream,
  rising: THEME.air,
  receptors: THEME.firing,
  swallow: THEME.cherry,
};

export const ODORANT_COLOURS: Readonly<Record<OdorantId, string>> = {
  benzaldehyde: THEME.benzaldehyde,
  hexenal: THEME.hexenal,
  linalool: THEME.linalool,
  eugenol: THEME.eugenol,
  ionone: THEME.ionone,
};

export const ATOM_COLOURS: Readonly<Record<ElementId, string>> = {
  C: THEME.carbon,
  O: THEME.oxygen,
  H: THEME.hydrogen,
};

export const TASTE_GLOWS = {
  sweet: THEME.sweetGlow,
  sour: THEME.sourGlow,
  cold: THEME.coldGlow,
} as const;
