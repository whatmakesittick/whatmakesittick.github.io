import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../../../theme';

const GALVANISED = '#c3cad1';
const TRANSFORMER_GREY = '#ccd4dc';
const RADIATOR_GREY = '#b2bcc6';

export const YARD_STEEL_FINISH: MaterialFinish = {
  color: GALVANISED,
  roughness: 0.42,
  metalness: 0.3,
};

export const TRANSFORMER_FINISH: MaterialFinish = {
  color: TRANSFORMER_GREY,
  roughness: 0.4,
  metalness: 0.05,
};

export const RADIATOR_FINISH: MaterialFinish = {
  color: RADIATOR_GREY,
  roughness: 0.5,
  metalness: 0.2,
};

export const BUSBAR = { radius: 0.25, perMetre: 0.0003, glow: 0.9 } as const;

export const BUSBAR_GLOW_FINISH: MaterialFinish = {
  ...YARD_STEEL_FINISH,
  emissive: THEME.cable,
  emissiveIntensity: BUSBAR.glow,
};

export const CONDUCTOR = {
  radius: 0.2,
  sides: 4,
  samples: 12,
  sagM: 7,
  perMetre: 0.00036,
  glow: 0.5,
} as const;

export const CONDUCTOR_FINISH: MaterialFinish = {
  color: THEME.gridLine,
  roughness: 0.6,
  metalness: 0.3,
};

export const CONDUCTOR_GLOW_FINISH: MaterialFinish = {
  ...CONDUCTOR_FINISH,
  emissive: THEME.cable,
  emissiveIntensity: CONDUCTOR.glow,
};
