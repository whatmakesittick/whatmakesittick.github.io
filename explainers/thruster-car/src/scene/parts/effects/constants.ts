import { toRadians } from '@core/math';
import { CAMERA_FOV } from '@core/scene/constants';
import type { MaterialFinish } from '@core/scene/materials';
import type { GasId } from '../../../ids';
import { THEME } from '../../../theme';

export const POINT_SIZE_PER_METRE = 1 / Math.tan(toRadians(CAMERA_FOV) / 2);

export const RENDER_ORDER = { ghost: 1, plume: 2, arrow: 10 } as const;

export const PLUME_LENGTH_AT_MAX_THRUST_M = 1.5;
export const PLUME_WAKE_SHARE = 1.6;
export const PLUME_LENGTH_SCALE: Readonly<Record<GasId, number>> = {
  air: 1,
  nitrogen: 1,
  helium: 1.6,
};

export interface PlumeLook {
  coreOpacity: number;
  wakeOpacity: number;
  spread: number;
  wakeSpread: number;
  scale: number;
}

const CONDENSATION: PlumeLook = {
  coreOpacity: 0.9,
  wakeOpacity: 0.32,
  spread: 0.14,
  wakeSpread: 0.6,
  scale: 1,
};

const HELIUM_HAZE: PlumeLook = {
  coreOpacity: 0.42,
  wakeOpacity: 0.1,
  spread: 0.09,
  wakeSpread: 0.38,
  scale: 0.78,
};

export const PLUME_LOOKS: Readonly<Record<GasId, PlumeLook>> = {
  air: CONDENSATION,
  nitrogen: CONDENSATION,
  helium: HELIUM_HAZE,
};

export const PLUME = {
  puffs: 72,
  seed: 101,
  mouthRadius: 0.03,
  mouthDiameter: 0.09,
  growth: 0.5,
  wakeGrowth: 1.1,
  sizeJitter: [0.75, 1.25],
  lifeSeconds: 0.3,
  lifeJitter: 0.35,
  drift: 1.3,
  coreHold: 0.4,
  mouthFloor: 0.5,
  fadeInShare: 0.12,
  sway: { amplitude: 0.06, rate: 11, lag: 5, ratio: 0.83 },
  flicker: { depth: 0.2, rate: 17 },
  labelShare: 0.6,
} as const;

export const NEWTONS_PER_KN = 1000;
export const METRES_PER_KN = 0.12;

export interface ArrowStyle {
  shaftRadius: number;
  headRadius: number;
  headLength: number;
  tipGap: number;
}

export const MAIN_ARROW: ArrowStyle = {
  shaftRadius: 0.045,
  headRadius: 0.12,
  headLength: 0.3,
  tipGap: 0,
};

export const NOZZLE_ARROW: ArrowStyle = {
  shaftRadius: 0.02,
  headRadius: 0.055,
  headLength: 0.13,
  tipGap: 0.04,
};

export const ARROW_EASE = { rate: 8, settle: 0.002, shown: 0.01 } as const;

function arrowFinish(tone: string): MaterialFinish {
  return {
    color: tone,
    emissive: tone,
    emissiveIntensity: 0.45,
    roughness: 0.45,
    metalness: 0.05,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  };
}

export const ARROW_FINISHES = {
  weight: arrowFinish(THEME.weight),
  thrust: arrowFinish(THEME.netThrust),
} as const;

export const FAN_GLOW = {
  rows: [-0.45, 0.45],
  columns: [-1.5, -0.75, 0, 0.75, 1.5],
  drop: 0.03,
  diameter: 1.3,
  opacity: 0.5,
  pool: { length: 1.05, width: 1.25, lift: 0.02, opacity: 0.65, glow: 1.4, swell: 0.05 },
  pulse: { rate: 4.5, depth: 0.35, wave: 1.2 },
  label: [0, -0.06, 1] as const,
} as const;

export const CONTACT_SHADOW = { length: 1.2, width: 1.45, lift: 0.012, opacity: 0.8 } as const;

export const GHOST_PATH = {
  sampleSeconds: 0.02,
  spacing: 0.45,
  diameter: 0.16,
  opacity: 0.8,
  taperDots: 4,
  tone: THEME.text,
} as const;

export const GHOST_FINISH: MaterialFinish = {
  color: '#d9e2ff',
  emissive: THEME.fillLight,
  emissiveIntensity: 0.25,
  roughness: 0.7,
  metalness: 0,
  transparent: true,
  opacity: 0.2,
  depthWrite: false,
};
