import { toRadians } from '@core/math';
import { CAMERA_FOV } from '@core/scene/constants';
import type { MaterialFinish } from '@core/scene/materials';
import type { GasId, NozzlePartId } from '../../../ids';
import { THEME } from '../../../theme';

export const POINT_SIZE_PER_METRE = 1 / Math.tan(toRadians(CAMERA_FOV) / 2);

export const RENDER_ORDER = { ghost: 1, plume: 2, arrow: 10 } as const;

export const PLUME_WAKE_SHARE: Readonly<Record<NozzlePartId, number>> = {
  cornerNozzles: 2,
  frontNozzles: 2,
  rearNozzles: 3,
};
export const PLUME_PUFFS: Readonly<Record<NozzlePartId, number>> = {
  cornerNozzles: 72,
  frontNozzles: 48,
  rearNozzles: 120,
};

export interface PlumeLook {
  coreOpacity: number;
  wakeOpacity: number;
  spread: number;
  wakeSpread: number;
  scale: number;
}

const CONDENSATION: PlumeLook = {
  coreOpacity: 1,
  wakeOpacity: 0.7,
  spread: 0.1,
  wakeSpread: 0.22,
  scale: 1,
};

const HELIUM_HAZE: PlumeLook = {
  coreOpacity: 0.55,
  wakeOpacity: 0.2,
  spread: 0.07,
  wakeSpread: 0.22,
  scale: 0.8,
};

export const PLUME_LOOKS: Readonly<Record<GasId, PlumeLook>> = {
  air: CONDENSATION,
  nitrogen: CONDENSATION,
  helium: HELIUM_HAZE,
};

export const PLUME = {
  seed: 101,
  mouthRadius: 0.025,
  mouthDiameter: 0.07,
  growth: 0.35,
  wakeGrowth: 0.35,
  maxDiameter: 1.5,
  sizeJitter: [0.75, 1.25],
  lifeSeconds: 0.5,
  lifeJitter: 0.35,
  drift: 1.7,
  slowest: 0.15,
  coreHold: 0.6,
  wakeHold: 0.3,
  textureFill: 0.3,
  mouthFloor: 0.75,
  fadeInShare: 0.08,
  rise: 0.1,
  sway: { amplitude: 0.04, wake: 0.12, rate: 9, lag: 4, ratio: 0.83 },
  flicker: { depth: 0.15, rate: 13 },
  labelShare: 0.6,
} as const;

export const PLUME_SHADING = {
  base: 0.6,
  sun: 0.4,
  top: 0.3,
  coreClear: 0.35,
  warmth: 0.3,
  shade: '#8d90a6',
  sunlit: THEME.keyLight,
} as const;

export const GROUND_HAZE = {
  puffs: 160,
  seed: 211,
  tone: '#d8d1c7',
  opacity: 0.38,
  textureFill: 0.3,
  lifeSeconds: [0.9, 1.5],
  reach: { from: 0.3, to: 0.9 },
  width: 0.45,
  height: [0.05, 0.25],
  diameter: [0.5, 1.5],
  sizeJitter: [0.7, 1.3],
  roll: { back: 1.4, out: 1.6, up: 0.1 },
  near: { full: 0.8, none: 2.2 },
  rescatter: 3,
  fadeIn: 0.12,
  shown: 0.02,
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
  pool: { length: 1.05, width: 1.25, lift: 0.04, opacity: 0.6, glow: 1.1, swell: 0.05 },
  pulse: { rate: 4.5, depth: 0.35, wave: 1.2 },
  label: [0, -0.06, 1] as const,
} as const;

export const CONTACT_SHADOW = {
  size: [1.3, 1.7],
  pad: [0.98, 0.96],
  padCorner: 0.45,
  padBlur: 0.55,
  padAlpha: 0.88,
  tyre: [0.48, 0.3],
  tyreAlpha: 0.95,
  offset: [0.12, -0.08],
  lift: 0.012,
} as const;

export const GHOST_PATH = {
  sampleSeconds: 0.02,
  spacing: 0.45,
  diameter: 0.16,
  opacity: 0.8,
  taperDots: 4,
  labelLift: 1,
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
