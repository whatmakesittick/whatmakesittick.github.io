export const SCENE_UNITS_PER_METRE = 3;

export const HOVER_HEIGHT = 1.6;
export const BODY_PIVOT_HEIGHT = 1.3;
export const FORWARD_BODY_PITCH_DEGREES = 6;
export const SETTLE_RATE = 4;

export const FUSELAGE = {
  axisHeight: 1.2,
  widthScale: 0.78,
  profile: [
    [2.55, 0],
    [2.45, 0.32],
    [2.2, 0.6],
    [1.7, 0.8],
    [0.9, 0.87],
    [0, 0.84],
    [-0.8, 0.7],
    [-1.35, 0.46],
    [-1.7, 0.2],
  ],
  profileSamples: 28,
  radialSegments: 28,
  canopyStart: 0.95,
  canopyEnd: 2.5,
  canopyInflate: 1.012,
  canopyArc: Math.PI * 1.25,
} as const;

export const COWLING = {
  centerX: -0.35,
  centerY: 1.92,
  radius: 0.36,
  length: 1.1,
  heightScale: 0.72,
} as const;

export const TAIL_BOOM = {
  start: -1.4,
  end: -6.25,
  rootRadius: 0.24,
  tipRadius: 0.1,
  axisHeight: 1.45,
} as const;

export const FIN = {
  thickness: 0.06,
  upper: [
    [-5.55, 1.45],
    [-6.05, 2.55],
    [-6.4, 2.55],
    [-6.3, 1.45],
  ],
  lower: [
    [-5.85, 1.45],
    [-6.2, 0.95],
    [-6.4, 0.95],
    [-6.3, 1.45],
  ],
} as const;

export const STABILIZER = {
  centerX: -5.25,
  span: 1.7,
  chord: 0.42,
  thickness: 0.05,
} as const;

export const SKIDS = {
  tubeRadius: 0.04,
  crossRadius: 0.035,
  halfTrack: 0.95,
  rear: -1.3,
  front: 1.35,
  toeRise: 0.32,
  toeReach: 0.45,
  crossTubes: [-0.75, 0.85],
  crossTop: 0.62,
  crossInset: 0.42,
  tubularSegments: 40,
  radialSegments: 10,
} as const;

export const MAST = {
  radius: 0.07,
  bottom: 2.05,
} as const;

export const HUB = {
  height: 2.78,
  radius: 0.15,
  thickness: 0.16,
  capRadius: 0.1,
  capHeight: 0.1,
  gripLength: 0.34,
  gripRadius: 0.05,
} as const;

export const SWASHPLATE = {
  radius: 0.3,
  ringHeight: 0.04,
  ringGap: 0.01,
  lowest: 2.3,
  travel: 0.14,
  tiltPerCyclicDegree: 1.5,
  lugRadius: 0.03,
} as const;

export const PITCH_LINK = {
  radius: 0.018,
  hornSpan: 0.24,
  hornLead: 0.18,
} as const;

export const MAIN_BLADE = {
  root: 0.45,
  chord: 0.28,
  thickness: 0.12,
  tipStripe: 0.4,
} as const;

export const TAIL_ROTOR = {
  centerX: -6.15,
  centerY: 2.05,
  sideOffset: 0.22,
  radius: 0.75,
  bladeCount: 2,
  root: 0.1,
  chord: 0.13,
  thickness: 0.12,
  fixedPitchDegrees: 8,
  hubRadius: 0.07,
  hubLength: 0.14,
  gearboxRadius: 0.11,
} as const;

export const RADIAL_SEGMENTS = 32;

export const DOWNWASH = {
  count: 240,
  particleSize: 0.22,
  opacity: 0.7,
  fallPerRpm: 0.09,
  minimumLift: 0.05,
  wakeContraction: 0.25,
  forwardSkew: 1.4,
  startAbove: 0.3,
  fadeIn: 0.12,
  fadeOut: 0.2,
} as const;
