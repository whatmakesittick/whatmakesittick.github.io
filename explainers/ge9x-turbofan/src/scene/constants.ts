import { toRadians } from '@core/math';
import { activeScheme } from '@core/theme';
import type { Scheme } from '@core/theme';

export const ROW_LOD_DISTANCE_M = 22;

export const SCENE_LIMITS = {
  cameraNear: 0.05,
  cameraFar: 120,
  maxPolarAngle: Math.PI * 0.47,
  cameraMinDistance: 2.5,
  cameraMaxDistance: 30,
} as const;

export const CUT = {
  halfAngle: toRadians(75),
  coreHalfAngle: toRadians(108),
  centre: toRadians(12),
  capOpacityFloor: 0.99,
  lowerFaceShade: 0.74,
  rimMetres: 0.012,
  rimLift: 1.2,
  rimMix: 0.85,
} as const;

interface SchemeLook {
  readonly additive: boolean;
  readonly cutCap: string;
  readonly glowGain: number;
  readonly streakGain: number;
  readonly streakCover: number;
  readonly plumeGain: number;
  readonly envNacelle: number;
  readonly envLip: number;
}

const LOOKS: Readonly<Record<Scheme, SchemeLook>> = {
  dark: {
    additive: true,
    cutCap: '#c98f3c',
    glowGain: 1,
    streakGain: 1,
    streakCover: 0.45,
    plumeGain: 1,
    envNacelle: 1.9,
    envLip: 1.8,
  },
  light: {
    additive: false,
    cutCap: '#b9792a',
    glowGain: 1.35,
    streakGain: 1.6,
    streakCover: 1,
    plumeGain: 0.7,
    envNacelle: 1.4,
    envLip: 1.5,
  },
};

export const LOOK: SchemeLook = LOOKS[activeScheme()];

export const SEGMENTS = {
  shell: 112,
  core: 80,
  disc: 56,
  small: 48,
  tiny: 16,
} as const;

export const HEAT_LOOK = {
  curve: 1.25,
  linerGain: 1.5,
  hptGain: 1.25,
  lptGain: 1.0,
  nozzleGain: 0.5,
  dimGlow: 0.25,
} as const;

export const EFFECT_LOOK = {
  gasAlpha: 0.42,
  flameAlpha: 1.1,
  shimmerSpeed: 9,
  hotPlumeAlpha: 0.38,
  coldPlumeAlpha: 0.16,
  blurSheen: '#dfe6ee',
  blurShade: '#525a64',
  blurInner: 0.47,
  blurSpan: 1.22,
  streakMinPixels: 1.6,
} as const;

export const COMBUSTOR_LIGHT = {
  colour: '#ff9a4a',
  intensity: 9,
  distance: 3.2,
  decay: 2,
  x: 0.5,
} as const;

export const PLUME_LIGHT = {
  colour: '#ffb070',
  intensity: 6,
  distance: 4,
  decay: 2,
  x: 3.2,
} as const;

export const EASE = {
  blurRate: 6,
  settle: 0.002,
} as const;

export const FAN = {
  stackX: -2.33,
  hub: 0.43,
  tip: 1.69,
  stations: 18,
  samples: 13,
  edgeSamples: 4,
  edgeShare: 0.12,
  edgeInflate: 1.3,
  edgeLift: 0.004,
  blurX: -2.3,
} as const;

export const GUIDE_VANES = {
  count: 40,
  x: -1.93,
  width: 0.13,
} as const;

export const FUEL_NOZZLES = 20;

export const REVERSER = {
  travel: 0.55,
  doors: 12,
  doorTilt: 1.2,
  cascadeVanes: 8,
  strongbacks: 24,
} as const;

export const SPIRAL = {
  turns: 1.15,
  startRadius: 0.025,
  endRadius: 0.4,
  samples: 64,
  widthStart: 0.022,
  widthEnd: 0.05,
  lift: 0.004,
} as const;

export const STREAMS = {
  cutFade: 0.3,
  cutEnd: 2.8,
  cutMargin: 0.12,
  gatherShare: 0.72,
  gatherDrift: 0.18,
  tearAngle: 0.6,
  reversedAlpha: 1.8,
  markerBoost: 1.4,
  markerReach: 0.3,
  fadeIn: 0.12,
  fadeOut: 0.06,
  minPixels: 1.6,
  beadRadius: 0.04,
  ringRadius: 0.085,
  ringTube: 0.006,
  ringOpacity: 0.8,
  glowOpacity: 0.9,
  glowSize: 0.42,
  markerAngle: 40,
  labelAngle: 40,
  baseSpeed: 1.6,
  coldWidth: 0.016,
  hotWidth: 0.026,
  coldLength: 0.16,
  hotLength: 0.22,
  coldAlpha: 0.3,
  hotAlpha: 0.8,
} as const;

export const PERSON = {
  facing: -0.75,
} as const;

export const COARSE_POINTER_QUERY = '(pointer: coarse)';

export const DIM_OPACITY = 0.35;
