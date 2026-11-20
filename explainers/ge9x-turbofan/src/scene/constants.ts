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
  coreHalfAngle: toRadians(75),
  centre: toRadians(12),
  coreCentre: toRadians(50),
  capOpacityFloor: 0.99,
  lowerFaceShade: 0.74,
  rimMetres: 0.007,
  rimMix: 0.9,
} as const;

interface SchemeLook {
  readonly additive: boolean;
  readonly cutCap: string;
  readonly cutRim: string;
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
    cutCap: '#30343a',
    cutRim: '#dfe4ea',
    glowGain: 1,
    streakGain: 1,
    streakCover: 0.45,
    plumeGain: 1,
    envNacelle: 1.9,
    envLip: 2.8,
  },
  light: {
    additive: false,
    cutCap: '#454a52',
    cutRim: '#ffffff',
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
  linerGain: 0.8,
  hptGain: 1.3,
  lptGain: 1.0,
  rampCap: 0.9,
  nozzleGain: 0.5,
  dimGlow: 0.25,
} as const;

export const EFFECT_LOOK = {
  gasAlpha: 0.42,
  haloAlpha: 0.32,
  flameAlpha: 1.4,
  shimmerSpeed: 9,
  hotPlumeAlpha: 0.38,
  coldPlumeAlpha: 0.16,
  reversePlumeAlpha: 0.42,
  blurSheen: '#d3dbe4',
  blurShade: '#3a414a',
  blurInner: 0.47,
  blurSpan: 1.22,
  streakMinPixels: 1.6,
} as const;

export const COMBUSTOR_LIGHT = {
  colour: '#ff9a4a',
  intensity: 3.2,
  distance: 3.2,
  decay: 2,
  x: 0.62,
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
  stageSeconds: 2,
  doors: 12,
  doorTilt: 1.2,
  cascadeVanes: 6,
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
  reversedAlpha: 2.6,
  reversedWidth: 2,
  reversedLength: 1.6,
  lengthBase: 0.25,
  lengthGain: 0.95,
  alphaBase: 0.45,
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
  hotWidth: 0.02,
  coldLength: 0.16,
  hotLength: 0.22,
  coldAlpha: 0.3,
  hotAlpha: 0.62,
} as const;

export const PERSON = {
  facing: -0.75,
} as const;

export const HALL = {
  radius: 60,
  floorSegments: 64,
  domeSegments: 32,
  outline: { fromX: -4.9, toX: 4.7, halfZ: 3.1 },
  lineWidth: 0.05,
  dash: 1.2,
  hazardHalfZ: 1.7,
  hazardDepth: 0.5,
  hazardFrequency: 2.4,
  slab: 4,
  shadowSpread: 0.6,
  shadowHalfZ: 2.1,
  personShadow: 0.5,
  reflectSampleX: -1.0,
  ceiling: 11,
  stripRowGap: 6,
  stripWidth: 0.35,
  stripPitch: 7,
  glowX: 3.6,
  fadeFrom: 16,
  fadeTo: 48,
  bays: 18,
  lampRise: 0.2,
  panelRise: 0.42,
} as const;

interface HallLook {
  readonly floorDark: string;
  readonly floorLight: string;
  readonly paint: string;
  readonly hazardDark: string;
  readonly centreLine: string;
  readonly reflectBase: number;
  readonly reflectTint: string;
  readonly strip: string;
  readonly stripReflect: number;
  readonly shadow: number;
  readonly glow: string;
  readonly glowGain: number;
  readonly horizon: string;
  readonly wall: string;
  readonly ceiling: string;
  readonly bayShade: number;
  readonly lampGain: number;
  readonly panelGain: number;
  readonly haze: string;
  readonly hazeGain: number;
  readonly vignette: string;
  readonly vignetteStrength: number;
  readonly background: string;
}

const HALL_LOOKS: Readonly<Record<Scheme, HallLook>> = {
  dark: {
    floorDark: '#24272b',
    floorLight: '#34383d',
    paint: '#c99a2e',
    hazardDark: '#16181b',
    centreLine: '#b9bec4',
    reflectBase: 0.06,
    reflectTint: '#9aa3ad',
    strip: '#dfe9f5',
    stripReflect: 0.55,
    shadow: 0.62,
    glow: '#ff8a3c',
    glowGain: 0.15,
    horizon: '#23272d',
    wall: '#191c21',
    ceiling: '#0f1114',
    bayShade: 0.25,
    lampGain: 0.22,
    panelGain: 0.07,
    haze: '#3a4350',
    hazeGain: 0.35,
    vignette: '#050608',
    vignetteStrength: 0.55,
    background: '#0f1114',
  },
  light: {
    floorDark: '#c3c6c9',
    floorLight: '#d6d9db',
    paint: '#d6a422',
    hazardDark: '#3b3e42',
    centreLine: '#ffffff',
    reflectBase: 0.05,
    reflectTint: '#ffffff',
    strip: '#ffffff',
    stripReflect: 0.25,
    shadow: 0.38,
    glow: '#ff9a52',
    glowGain: 0.14,
    horizon: '#e3e5e8',
    wall: '#d9dce0',
    ceiling: '#c9cdd2',
    bayShade: 0.06,
    lampGain: 0.16,
    panelGain: 0.05,
    haze: '#f2f3f5',
    hazeGain: 0.25,
    vignette: '#5d636b',
    vignetteStrength: 0.22,
    background: '#c9cdd2',
  },
};

export const HALL_LOOK: HallLook = HALL_LOOKS[activeScheme()];

export const COARSE_POINTER_QUERY = '(pointer: coarse)';
