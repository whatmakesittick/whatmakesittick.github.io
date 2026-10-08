import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../../../theme';
import { GROUND_LIFT_M } from '../../constants';

const BRIGHT_WHITE = '#fbfcfd';

export const TURBINE_FINISH: MaterialFinish = {
  color: BRIGHT_WHITE,
  emissive: THEME.turbineWhite,
  emissiveIntensity: 0.42,
  roughness: 0.42,
  metalness: 0,
};

export const NACELLE_FINISH: MaterialFinish = { ...TURBINE_FINISH, vertexColors: true };

export const DEFICIT_SHADE = { colour: '#8ea4bd', full: 0.45 } as const;

export const TURBINE_WIDEN = { halfWidth: 1.9, perMetre: 0.0011 } as const;

export const BLADE_WIDEN = {
  halfWidth: 1.25,
  perMetre: 0.0008,
  rootWeight: 1.3,
  tipWeight: 0.7,
} as const;

export const DISC = {
  segments: 40,
  maxOpacity: 0.7,
  opacityStep: 0.05,
  glow: 0.6,
  edgeBoost: 2,
} as const;

export const ROTOR_TILT = { minFacing: 0.45 } as const;

export const DISC_FINISH: MaterialFinish = {
  color: THEME.turbineWhite,
  emissive: THEME.turbineWhite,
  emissiveIntensity: DISC.glow,
  roughness: 0.9,
  metalness: 0,
  transparent: true,
  depthWrite: false,
  side: DoubleSide,
};

export const CONTACT_SHADOW = {
  length: 130,
  width: 40,
  baseShare: 0.12,
  opacity: 0.6,
  lift: GROUND_LIFT_M + 0.3,
  alongSteps: 8,
  acrossSteps: 4,
  fullSizeDistance: 4000,
  maxScale: 3,
  scaleStep: 0.25,
} as const;
