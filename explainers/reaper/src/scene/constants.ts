import { toRadians } from '@core/math';
import type { MissileStage } from '../ids';
import { AIRCRAFT, AIRCRAFT_LAYOUT, BOMBS, HELLFIRE } from '../model/layout';
import type { LoftSection } from './geometry/loft';

type Triple = readonly [number, number, number];

export const AIRFRAME_SHADE = { top: 1, bottom: 0.84, from: -0.55, to: 0.25 } as const;

export const FUSELAGE = {
  squareness: 2.3,
  radialSegments: 48,
  samplesBetween: 4,
  sections: [
    { x: 6, bottom: -0.035, waist: 0, top: 0.035, halfWidth: 0.035 },
    { x: 5.95, bottom: -0.16, waist: -0.02, top: 0.13, halfWidth: 0.16 },
    { x: 5.82, bottom: -0.29, waist: -0.04, top: 0.23, halfWidth: 0.28 },
    { x: 5.56, bottom: -0.43, waist: -0.05, top: 0.34, halfWidth: 0.4 },
    { x: 5.15, bottom: -0.52, waist: -0.05, top: 0.42, halfWidth: 0.47 },
    { x: 4.5, bottom: -0.56, waist: -0.05, top: 0.46, halfWidth: 0.51 },
    { x: 3.4, bottom: -0.57, waist: -0.05, top: 0.47, halfWidth: 0.52 },
    { x: 2, bottom: -0.57, waist: -0.04, top: 0.45, halfWidth: 0.52 },
    { x: 0.6, bottom: -0.56, waist: -0.03, top: 0.44, halfWidth: 0.5 },
    { x: -0.8, bottom: -0.53, waist: -0.02, top: 0.42, halfWidth: 0.46 },
    { x: -2, bottom: -0.46, waist: 0, top: 0.4, halfWidth: 0.4 },
    { x: -3.2, bottom: -0.35, waist: 0.01, top: 0.32, halfWidth: 0.31 },
    { x: -4.1, bottom: -0.25, waist: 0.01, top: 0.24, halfWidth: 0.23 },
    { x: -4.7, bottom: -0.17, waist: 0, top: 0.17, halfWidth: 0.16 },
    { x: -4.86, bottom: -0.15, waist: 0, top: 0.15, halfWidth: 0.145 },
  ] satisfies LoftSection[],
} as const;

export const HUMP = {
  squareness: 2.2,
  radialSegments: 40,
  samplesBetween: 4,
  sections: [
    { x: 5.84, bottom: 0.08, waist: 0.16, top: 0.22, halfWidth: 0.1 },
    { x: 5.72, bottom: 0, waist: 0.18, top: 0.4, halfWidth: 0.27 },
    { x: 5.48, bottom: -0.02, waist: 0.21, top: 0.58, halfWidth: 0.37 },
    { x: 5.08, bottom: -0.02, waist: 0.24, top: 0.73, halfWidth: 0.43 },
    { x: 4.5, bottom: -0.02, waist: 0.25, top: 0.83, halfWidth: 0.455 },
    { x: 3.9, bottom: -0.02, waist: 0.25, top: 0.85, halfWidth: 0.455 },
    { x: 3.3, bottom: -0.02, waist: 0.25, top: 0.81, halfWidth: 0.45 },
    { x: 2.5, bottom: 0, waist: 0.25, top: 0.71, halfWidth: 0.43 },
    { x: 1.6, bottom: 0.02, waist: 0.24, top: 0.62, halfWidth: 0.4 },
    { x: 0.6, bottom: 0.04, waist: 0.22, top: 0.55, halfWidth: 0.35 },
    { x: -0.4, bottom: 0.06, waist: 0.2, top: 0.49, halfWidth: 0.29 },
    { x: -1.1, bottom: 0.1, waist: 0.2, top: 0.43, halfWidth: 0.14 },
  ] satisfies LoftSection[],
} as const;

export const AIRFOIL_SAMPLES = { wing: 16, fin: 10, blade: 8, pylon: 8, fairing: 8 } as const;

const WING_LEADING_EDGE_SHARE = 0.25;

export const WING = {
  halfSpan: AIRCRAFT.span / 2,
  rootChord: AIRCRAFT.rootChord,
  tipChord: AIRCRAFT.tipChord,
  rootLeadingEdgeX:
    AIRCRAFT_LAYOUT.wingQuarterChord[0] + WING_LEADING_EDGE_SHARE * AIRCRAFT.rootChord,
  rootY: AIRCRAFT_LAYOUT.wingQuarterChord[1],
  sweep: toRadians(1.5),
  dihedral: toRadians(2),
  thickness: { root: 0.15, tip: 0.11 },
  camber: 0.025,
  innerSpan: 2.3,
  tipRound: { span: 0.1, chord: 0.86, thickness: 0.35, setBack: 0.04 },
} as const;

export const TAIL = {
  fin: {
    root: [-3.3, 0.1, 0] as Triple,
    rootChord: 1.3,
    tipChord: 0.6,
    span: (AIRCRAFT_LAYOUT.tailTop[1] - 0.1) / Math.sin(toRadians(45)),
    dihedral: toRadians(45),
    sweep: toRadians(23),
    thickness: 0.1,
  },
  ventral: {
    root: [-3.5, -0.05, 0] as Triple,
    rootChord: 1.15,
    tipChord: 0.52,
    depth: 1.32,
    sweep: toRadians(28),
    thickness: 0.1,
  },
} as const;

export const PROPELLER = {
  centre: AIRCRAFT_LAYOUT.propeller,
  radius: 1.3,
  blades: AIRCRAFT.propellerBlades,
  stations: [
    { radius: 0.12, chord: 0.16, pitch: toRadians(55), thickness: 0.2 },
    { radius: 0.3, chord: 0.22, pitch: toRadians(44), thickness: 0.13 },
    { radius: 0.6, chord: 0.23, pitch: toRadians(32), thickness: 0.09 },
    { radius: 1, chord: 0.18, pitch: toRadians(22), thickness: 0.07 },
    { radius: 1.27, chord: 0.11, pitch: toRadians(17), thickness: 0.06 },
    { radius: 1.3, chord: 0.05, pitch: toRadians(16), thickness: 0.05 },
  ],
  pitchAxisShare: 0.32,
  spinner: [
    [-4.86, 0.15],
    [-4.98, 0.15],
    [-5.12, 0.12],
    [-5.24, 0.07],
    [-5.31, 0],
  ] as readonly (readonly [number, number])[],
  spinnerSegments: 24,
  spinnerSamples: 10,
  spinRate: 22,
  blurOpacity: 0.32,
  blurFrom: 0.6,
  disc: {
    size: 128,
    hub: 0.12,
    tipRing: 0.94,
    ringWidth: 0.04,
    ringBoost: 0.8,
    edgeSoftness: 0.05,
  },
} as const;

export const SENSOR = {
  centre: AIRCRAFT_LAYOUT.sensorBall,
  radius: AIRCRAFT.sensorBallDiameter / 2,
  segments: 32,
  housing: { radius: 0.2, top: -0.5, bottom: -0.74, segments: 28 },
  bezel: { radius: 0.2, depth: 0.03 },
  windows: [
    { up: 0.02, side: -0.05, radius: 0.085 },
    { up: 0.1, side: 0.1, radius: 0.045 },
    { up: -0.08, side: 0.1, radius: 0.04 },
    { up: 0.11, side: -0.13, radius: 0.03 },
  ],
  windowDepth: 0.012,
  minDepression: toRadians(-2),
} as const;

export const SAT_DISH = {
  centre: [4.25, 0.36, 0] as Triple,
  radius: 0.3,
  depth: 0.085,
  segments: 28,
  pedestal: { radius: 0.07, height: 0.14 },
  feed: { length: 0.22, radius: 0.025 },
  minElevation: toRadians(12),
} as const;

export const GEAR = {
  nose: {
    pivot: [AIRCRAFT_LAYOUT.noseGear[0] + 0.05, -0.38, 0] as Triple,
    wheelRadius: 0.2,
    wheelWidth: 0.12,
    strutRadius: 0.04,
    oleoRadius: 0.062,
    oleoShare: 0.45,
    stowAngle: toRadians(-88),
    doors: { x: [2.72, 4.22] as const, from: 0, to: toRadians(17) },
  },
  main: {
    pivot: [AIRCRAFT_LAYOUT.mainGear[0] + 0.05, -0.42, 0.34] as Triple,
    wheelRadius: 0.28,
    wheelWidth: 0.16,
    strutRadius: 0.05,
    oleoRadius: 0.072,
    oleoShare: 0.4,
    stow: [1.3, 0.12, -0.14] as Triple,
    doors: { x: [-0.62, 1.42] as const, from: toRadians(5), to: toRadians(35) },
  },
  doorInflate: 0.007,
  wellInflate: 0.003,
  doorSamples: [10, 6] as const,
  doorOpenShare: 0.22,
  doorSwing: toRadians(95),
  wheelSegments: 22,
  hubShare: 0.55,
  shown: 0.002,
} as const;

export const PYLON = {
  x: AIRCRAFT_LAYOUT.pylonX,
  storeY: AIRCRAFT_LAYOUT.pylonY,
  stations: AIRCRAFT_LAYOUT.pylonZ,
  rootChord: 0.95,
  tipChord: 0.82,
  thickness: 0.16,
  sweepBack: 0.08,
} as const;

export const STORE_GAP = 0.02;

export const LAUNCHED_STAGES: readonly MissileStage[] = ['flying', 'hit', 'done'];
export const STRUCK_STAGES: readonly MissileStage[] = ['hit', 'done'];

export const GBU12 = {
  length: BOMBS.length,
  radius: BOMBS.diameter / 2,
  forwardShare: 0.55,
  profile: [
    [0, 0],
    [0.02, 0.05],
    [0.08, 0.085],
    [0.18, 0.095],
    [0.26, 0.1],
    [0.3, 0.12],
    [0.85, 0.12],
    [0.95, 0.128],
    [1.3, 0.135],
    [1.9, 0.135],
    [2.5, 0.115],
    [2.85, 0.1],
    [3.28, 0.09],
  ] as readonly (readonly [number, number])[],
  seekerUntil: 0.3,
  guidanceUntil: 0.9,
  band: { at: 1.05, width: 0.05, lift: 0.004 },
  canards: { from: 0.52, chord: 0.3, span: 0.16, tipChord: 0.06 },
  wings: { from: 2.62, chord: 0.62, span: 0.3, tipChord: 0.34 },
  finThickness: 0.012,
  segments: 20,
  samples: 24,
} as const;

export const HELLFIRE_SHAPE = {
  length: HELLFIRE.length,
  radius: HELLFIRE.diameter / 2,
  profile: [
    [0, 0],
    [0.025, 0.055],
    [0.07, 0.082],
    [0.12, 0.089],
    [1.55, 0.089],
    [1.62, 0.07],
  ] as readonly (readonly [number, number])[],
  seekerUntil: 0.08,
  canards: { from: 0.22, chord: 0.16, span: 0.07, tipChord: 0.06 },
  wings: {
    from: 1.22,
    chord: 0.34,
    span: HELLFIRE.finSpan / 2 - HELLFIRE.diameter / 2,
    tipChord: 0.2,
  },
  finThickness: 0.01,
  segments: 16,
  samples: 14,
} as const;

export const LAUNCHER = {
  length: 1.25,
  width: 0.14,
  height: 0.16,
  railOffset: { y: -0.11, z: 0.165 },
  forward: 0.08,
} as const;

export const ENGINE = {
  core: [
    [-2.05, 0.12],
    [-2.2, 0.19],
    [-2.5, 0.21],
    [-3.2, 0.2],
    [-3.6, 0.17],
    [-3.95, 0.15],
  ] as readonly (readonly [number, number])[],
  gearbox: [
    [-3.95, 0.13],
    [-4.1, 0.16],
    [-4.45, 0.155],
    [-4.7, 0.09],
  ] as readonly (readonly [number, number])[],
  shaft: { from: -4.7, to: -4.95, radius: 0.04 },
  rings: [-2.35, -2.7, -3.05, -3.45],
  ringRadius: 0.215,
  ringWidth: 0.025,
  intakeDuct: { from: [-1.55, 0.36, 0] as Triple, to: [-2.15, 0.12, 0] as Triple, radius: 0.08 },
  exhaust: { from: [-3.3, 0.02, 0.14] as Triple, to: [-3.05, -0.06, 0.36] as Triple, radius: 0.06 },
  accessories: [
    { at: [-2.6, -0.2, 0.08] as Triple, size: [0.28, 0.1, 0.12] as Triple },
    { at: [-3.05, -0.17, -0.1] as Triple, size: [0.22, 0.09, 0.1] as Triple },
    { at: [-2.45, 0.2, -0.12] as Triple, size: [0.18, 0.08, 0.08] as Triple },
  ],
  segments: 24,
  samples: 12,
} as const;

export const FUEL_TANK = {
  centre: {
    profile: [
      [-1.65, 0],
      [-1.55, 0.18],
      [-1.3, 0.27],
      [1.9, 0.29],
      [2.15, 0.2],
      [2.25, 0],
    ] as readonly (readonly [number, number])[],
    y: 0.08,
    squash: 0.92,
  },
  wing: { from: 0.55, to: 2.15, leadingShare: 0.12, chordShare: 0.52, thickness: 0.17 },
  labelX: 0.2,
  segments: 24,
  samples: 14,
} as const;

export const INTAKE = {
  x: [-1.15, -1.95] as const,
  halfWidth: 0.13,
  height: 0.12,
  lipThickness: 0.02,
} as const;

export const EXHAUST = {
  base: [-3.2, 0.02, 0] as Triple,
  side: 0.29,
  length: 0.24,
  radius: 0.055,
  flare: 1.12,
  droop: toRadians(18),
  sweep: toRadians(35),
} as const;

export const ANTENNA_BLADE = {
  thickness: 0.12,
  tipChord: 0.45,
  tipSetBack: 0.2,
  sink: 0.02,
} as const;

export const ANTENNAS = [
  { at: [-1.1, 0.46, 0] as Triple, height: 0.22, chord: 0.16, down: false },
  { at: [-2.6, 0.38, 0] as Triple, height: 0.18, chord: 0.13, down: false },
  { at: [1.8, -0.57, 0] as Triple, height: 0.16, chord: 0.14, down: true },
  { at: [-1.9, -0.47, 0] as Triple, height: 0.13, chord: 0.11, down: true },
] as const;

export const PROBE = { at: [5.75, -0.18, 0.12] as Triple, length: 0.35, radius: 0.012 } as const;

export const NAV_LIGHTS = {
  radius: 0.045,
  glow: 1.1,
  tail: [-4.72, 0.18, 0] as Triple,
  strobePeriod: 1.3,
  strobeFlash: 0.07,
  strobeSize: 2.6,
} as const;

export const FUSELAGE_PANELS = {
  size: [512, 128] as const,
  uLines: [0.06, 0.155, 0.27, 0.43, 0.52, 0.62, 0.74, 0.86],
  vLines: [0.5],
  boxes: [
    { u: [0.31, 0.41] as const, v: [0.08, 0.2] as const },
    { u: [0.31, 0.41] as const, v: [0.8, 0.92] as const },
    { u: [0.64, 0.72] as const, v: [0.28, 0.38] as const },
    { u: [0.64, 0.72] as const, v: [0.62, 0.72] as const },
    { u: [0.18, 0.25] as const, v: [0.6, 0.66] as const },
    { u: [0.18, 0.25] as const, v: [0.34, 0.4] as const },
  ],
  bands: [],
  lineShade: 0.8,
  lineWidth: 0.9,
  grain: 0.05,
  grainScale: 14,
  seed: 3,
} as const;

export const HUMP_PANELS = {
  size: [256, 128] as const,
  uLines: [0.08, 0.93],
  vLines: [],
  boxes: [],
  bands: [],
  lineShade: 0.84,
  lineWidth: 0.9,
  grain: 0.035,
  grainScale: 10,
  seed: 5,
} as const;

export const WING_PANELS = {
  size: [512, 128] as const,
  uLines: [0.229, 0.5, 0.94],
  vLines: [0.44, 0.56],
  boxes: [
    { u: [0.06, 0.5] as const, v: [0, 0.14] as const },
    { u: [0.06, 0.5] as const, v: [0.86, 1] as const },
    { u: [0.5, 0.93] as const, v: [0, 0.13] as const },
    { u: [0.5, 0.93] as const, v: [0.87, 1] as const },
  ],
  bands: [{ v: [0.47, 0.53] as const, shade: 0.9 }],
  lineShade: 0.78,
  lineWidth: 0.8,
  grain: 0.04,
  grainScale: 16,
  seed: 11,
} as const;

export const AIRCRAFT_BOX = {
  x: [PROPELLER.spinner[PROPELLER.spinner.length - 1][0], AIRCRAFT_LAYOUT.nose[0]] as const,
  y: [-AIRCRAFT.restHeight, AIRCRAFT_LAYOUT.tailTop[1]] as const,
  z: [-AIRCRAFT.span / 2, AIRCRAFT.span / 2] as const,
} as const;

export const SKY = {
  radius: 14000,
  widthSegments: 48,
  heightSegments: 24,
  renderOrder: -10,
  sunDirection: [0.42, 0.015, -1] as Triple,
  colours: {
    zenith: '#101b38',
    upper: '#24345e',
    rose: '#b56a7d',
    horizon: '#f2a65a',
    antiHorizon: '#c98a8f',
    glow: '#ffc07a',
    haze: '#d99a76',
    ridgeNear: '#3a2c3f',
    ridgeFar: '#6c4f60',
    cloudLit: '#ffc4a1',
    cloudShade: '#6d5a78',
    star: '#dfe8ff',
  },
  heights: { band: 0.035, rose: 0.16, upper: 0.42 },
  glow: { tight: 10, broad: 2.2, tightGain: 0.85, broadGain: 0.35 },
  ridge: { near: 0.003, nearRange: 0.03, far: 0.008, farRange: 0.034 },
  clouds: {
    from: 0.05,
    to: 0.5,
    cover: 0.58,
    sharpness: 0.22,
    scale: 1.5,
    stretch: 5,
    opacity: 0.75,
  },
  stars: { from: 0.32, density: 0.9975, gain: 0.6 },
} as const;

export const HAZE = { colour: SKY.colours.haze, near: 900, far: 6500 } as const;

export const GROUND = {
  extent: { x: [-9000, 10000] as const, z: [-9000, 9000] as const },
  fine: { x: [-560, 1560] as const, z: [-560, 860] as const },
  cell: 16,
  growth: 1.32,
  textureTile: 22,
  sand: {
    size: 256,
    ripples: 9,
    rippleDepth: 0.08,
    rippleWarp: 0.55,
    mottle: 0.22,
    speckle: 0.35,
    seed: 21,
  },
  colours: {
    sand: '#c7a16b',
    crest: '#d8b47c',
    trough: '#a9824f',
    gravel: '#9a8462',
    lake: '#e2d4b6',
    lakeEdge: '#cdb48a',
    rust: '#b07a4a',
  },
  dunes: {
    height: 2.6,
    wavelength: 95,
    direction: 0.6,
    wander: 0.35,
    swell: 5,
    swellScale: 700,
    patchScale: 260,
  },
  flats: [
    { centre: [-60, 10] as const, radius: [170, 75] as const, soft: 90, level: 0, gravel: 0.6 },
    { centre: [1000, 150] as const, radius: [55, 55] as const, soft: 90, level: 0, gravel: 0.15 },
  ],
  plains: { scale: 1400, from: 0.45, to: 0.7, share: 0.55, colour: '#9c8264' },
  lake: {
    centre: [-330, -230] as const,
    radius: [200, 110] as const,
    soft: 70,
    level: -0.25,
    gravel: 0,
  },
  tint: {
    troughUntil: 0.35,
    crestFrom: 0.55,
    rustScale: 180,
    rustFrom: 0.55,
    rustTo: 0.8,
    rustShare: 0.5,
    lakeEdge: 0.4,
    lakeEdgeShare: 0.8,
  },
} as const;

export const SHADOW = {
  size: 26,
  length: 16,
  opacity: 0.5,
  lift: 0.08,
  fadeAltitude: 140,
} as const;

export const AIRFIELD = {
  surface: 0.04,
  markingLift: 0.012,
  slabDepth: 0.4,
  steps: { pad: 0.002, taxiway: 0.005, apron: 0.008, shoulder: 0.01 },
  runway: {
    shoulder: 0.6,
    threshold: { bars: 6, length: 4.5, width: 0.32, gap: 0.24, inset: 1.2 },
    centreline: { dash: 3, gap: 2.2, width: 0.16, inset: 7.5 },
    edge: { width: 0.09, inset: 0.18 },
    aiming: { at: 18, length: 6, width: 0.5, offset: 1.4 },
    blastPad: { length: 15, chevrons: 3, spacing: 4.2, width: 0.3, angle: toRadians(40) },
  },
  taxiway: {
    z: 14,
    x: [-112, -16] as const,
    halfWidth: 1.1,
    links: [-104, -26] as const,
    line: 0.07,
  },
  apron: { x: [-104, -50] as const, z: [17, 42] as const },
  hangar: {
    centre: [-88, 0, 33] as Triple,
    width: 16,
    depth: 10,
    wall: 3.2,
    arch: 2.8,
    door: { width: 11, height: 4.6, offset: 0.02 },
    segments: 16,
  },
  container: {
    size: [5, 2.3, 2.3] as Triple,
    door: { width: 0.9, height: 1.8, sill: 0.1, depth: 0.03, shift: 0.25 },
    cooler: { size: [0.45, 0.7, 1] as Triple, lift: 0.5 },
    dish: {
      radius: 0.95,
      depth: 0.22,
      height: 1.1,
      tilt: toRadians(52),
      shift: 0.25,
      stand: [0.06, 0.09] as const,
    },
  },
  mast: {
    radius: [0.11, 0.05] as const,
    head: { radius: 0.18, height: 0.5 },
    beacon: 0.9,
    beaconLift: 0.1,
  },
  lights: {
    spacing: 6.25,
    edgeSize: 1.1,
    lift: 0.25,
    endLights: 7,
    endOffset: 0.6,
    taxiSpacing: 10,
    taxiOffset: 0.3,
    colours: { edge: '#ffe2b0', start: '#5dff8a', end: '#ff4b3a', taxi: '#5fa8ff' },
  },
  floods: {
    poles: [
      [-100, 0, 18],
      [-54, 0, 18],
      [-54, 0, 40],
    ] as readonly Triple[],
    height: 4.5,
    radius: [0.06, 0.08] as const,
    glow: 4.5,
    colour: '#ffd29a',
  },
  segments: { mast: 10, dish: 20, dishSamples: 8 },
  colours: {
    asphalt: '#2c2d31',
    taxiway: '#3a3b3f',
    blastPad: '#34353a',
    shoulder: '#6f6a60',
    concrete: '#8d8a83',
    marking: '#e9e6dc',
    taxiLine: '#e0b53a',
    hangar: '#8f9396',
    hangarInside: '#ffc787',
    container: '#cfc6ad',
    trim: '#4a4d52',
    mast: '#b9bcc0',
  },
} as const;

export const COMPOUND = {
  centre: [1000, 0, 150] as Triple,
  yard: { size: [26, 20] as const, colour: '#b18f63', lift: 0.03 },
  wall: { height: 0.95, thickness: 0.4, gate: 4.5, colour: '#a7835a' },
  buildings: [
    { at: [-7.5, 0, -4.5] as Triple, size: [7, 3.2, 5.2] as Triple, parapet: 0.3 },
    { at: [7, 0, 5.8] as Triple, size: [5, 2.6, 4.2] as Triple, parapet: 0.25 },
  ],
  building: { colour: '#bf9a6c', roof: '#a88760', door: '#3b2f25' },
  openings: {
    door: { width: 0.8, height: 1.7 },
    window: { width: 0.55, height: 0.5, sill: 1.2 },
    depth: 0.04,
    shift: 0.25,
  },
  vehicle: {
    body: [1.7, 0.5, 0.78] as Triple,
    cab: [0.65, 0.48, 0.74] as Triple,
    bedShift: -0.1,
    cabShift: 0.22,
    glass: { lift: 0.08, thickness: 0.04, height: 0.7, width: 0.9 },
    wheel: { radius: 0.2, width: 0.14, axle: 0.33, inset: 0.33, segments: 12 },
    clearance: 0.16,
    heading: toRadians(-32),
    colour: '#d9d3c4',
    windscreen: '#28323c',
    charred: '#2b2522',
    labelLift: 3,
  },
  palm: {
    spots: [
      [-11, 0, 7],
      [11.5, 0, -7],
    ] as readonly Triple[],
    trunk: { height: 2.6, radius: [0.09, 0.16] as const, lean: 0.18, segments: 10 },
    fronds: { count: 6, length: 1.5, width: 0.32, droop: 0.5, flatten: 0.25, segments: 6 },
    heart: { radius: 0.2, segments: 8 },
  },
} as const;

export const SATELLITE_SHAPE = {
  body: [16, 14, 14] as Triple,
  panel: { length: 46, width: 13, thickness: 0.4, boom: 8 },
  dish: { radius: 7, depth: 2, segments: 24, samples: 8 },
  feed: { length: 5, radius: 0.6, tip: 0.5 },
  boom: { radius: 0.5, segments: 8 },
  glow: { size: 140, opacity: 0.55 },
  cells: { size: [256, 64] as const, cells: [24, 4] as const, gap: 0.06, sheen: 0.4 },
  colours: {
    foil: '#d4a24a',
    cell: [0.08, 0.16, 0.42] as Triple,
    frame: [0.55, 0.58, 0.62] as Triple,
    dish: '#eef0f2',
    glow: '#bcd6ff',
  },
} as const;

export const SCENE_LIMITS = {
  cameraNear: 0.4,
  cameraFar: 32000,
  cameraMinDistance: 5,
  cameraMaxDistance: 4200,
  maxPolarAngle: Math.PI * 0.86,
} as const;

export const HIGHLIGHT_DIM = { saturation: 0.55, brightness: 0.62, emissive: 0.45 } as const;

export interface BeamLook {
  startRadius: number;
  endRadius: number;
  opacity: number;
  core: number;
  dash: { period: number; duty: number; speed: number; logScale: number };
  fade: readonly [start: number, end: number];
  segments: number;
}

export const BEAMS = {
  sat: {
    startRadius: 0.18,
    endRadius: 9,
    opacity: 0.85,
    core: 1.6,
    dash: { period: 2.4, duty: 0.55, speed: 1.6, logScale: 26 },
    fade: [0.004, 0.3],
    segments: 14,
  },
  los: {
    startRadius: 0.12,
    endRadius: 1.4,
    opacity: 0.8,
    core: 1.8,
    dash: { period: 2, duty: 0.5, speed: -1.4, logScale: 22 },
    fade: [0.01, 0.05],
    segments: 12,
  },
  laser: {
    startRadius: 0.035,
    endRadius: 0.55,
    opacity: 1,
    core: 2.4,
    dash: { period: 0, duty: 1, speed: 0, logScale: 0 },
    fade: [0.003, 0.002],
    segments: 10,
  },
  cone: {
    startRadius: 0.03,
    endRadius: 1,
    opacity: 0.2,
    core: 0.9,
    dash: { period: 22, duty: 0.82, speed: 0.6, logScale: 0 },
    fade: [0.08, 0.01],
    segments: 28,
  },
} as const satisfies Record<string, BeamLook>;

export const SENSOR_VIEW = {
  halfAngle: toRadians(3.6),
  footprintOpacity: 0.35,
  laserSpot: 7,
  laserGlow: 22,
  spotPulse: 7,
  labelShare: 0.35,
  beamLabelShare: 0.5,
} as const;

export const MISSILE_FX = {
  railBlend: 0.12,
  tangentStep: 0.002,
  core: { size: 1.4, colour: '#fff6dc' },
  glow: { size: 5.5, colour: '#ffb15a', opacity: 0.85 },
  flame: { length: 2.4, radius: 0.22, segments: 12 },
  flicker: { rate: 31, depth: 0.18 },
  trail: {
    count: 340,
    size: 6.5,
    opacity: 0.5,
    colour: '#e4ddd2',
    drift: 5,
    rise: 3,
    lifetime: 2.2,
  },
} as const;

export const IMPACT_FX = {
  lift: 1.2,
  core: { size: 34, colour: '#fff3d6' },
  glow: { size: 110, colour: '#ff9a3c', opacity: 0.9 },
  ground: { size: 90, colour: '#ff8a3a', opacity: 0.8 },
  ring: { from: 6, to: 60, width: 0.12, colour: '#ffd9a0', opacity: 0.8, segments: 64 },
  dust: {
    count: 220,
    size: 9,
    colour: '#b89a74',
    shade: '#6f5d4a',
    opacity: 0.6,
    linger: 0.22,
    rise: 34,
    spread: 26,
    riseTime: 2.2,
    fadeTime: 9,
    seed: 77,
  },
} as const;

export const TRACK = {
  width: 0.9,
  step: 4,
  lift: 0.35,
  colour: '#cfe3ff',
  opacity: 0.42,
  floor: 0.14,
  fadeDistance: 900,
  gap: 14,
  orbit: { width: 0.8, opacity: 0.45, dashes: 64, duty: 0.55, segments: 256 },
} as const;
