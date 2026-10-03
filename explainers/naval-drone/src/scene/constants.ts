import { toRadians } from '@core/math';
import { FAIRING, HATCHES, JET } from '../model/layout';
import { THEME } from '../theme';

type Triple = readonly [number, number, number];

export const HULL_LINES = {
  keelCurveTo: 2.1,
  stemBlend: [2.25, 2.4] as const,
  softness: 0.02,
  epsilon: 1e-6,
  flatTaperFrom: 1.6,
  panelShare: 0.6,
  railTaper: 0.15,
  cutX: 2.3,
  stations: { aftSpacing: 0.05, bowFrom: 2, bowSpacing: 0.02, tolerance: 0.004 },
} as const;

export const SHELL = {
  thickness: 0.012,
  fairing: 0.024,
  railRise: 0.016,
  railUv: [0.3, 0.31, 0.29] as Triple,
  jetHole: 0.112,
  centre: [-0.5, 0.1, 0] as Triple,
  port: [0, 0, 1] as Triple,
} as const;

export const SURFACE_MAPS = {
  edgeBand: 0.05,
  side: {
    size: [512, 128] as const,
    span: 1.2,
    mottle: { cells: [56, 10] as const, strength: 0.07, seed: 11 },
  },
  deck: {
    size: [1024, 256] as const,
    mottle: { cells: [72, 18] as const, strength: 0.06, seed: 5 },
    seams: {
      colour: '#b4b4b4',
      width: 0.006,
      reach: FAIRING.topHalfWidth,
      across: [-2.3, -1.8, -1.3, -0.8, 0.75, 2.05],
      along: [
        { z: -0.44, x: FAIRING.x },
        { z: 0.44, x: FAIRING.x },
      ],
    },
    groove: { colour: '#3c3c3c', width: 0.01 },
    lip: { colour: '#f4f4f4', width: 0.004 },
    radius: 0.03,
  },
  panel: {
    size: [128, 192] as const,
    cells: [6, 9] as const,
    line: '#d5d9dd',
    base: '#ffffff',
    sheen: '#e9ecef',
  },
  grain: { size: 64, low: 0.6, high: 0.84, seed: 3, repeat: [10, 3] as const },
} as const;

export const FAIRING_SHAPE = {
  sideSamples: 24,
  frontSamples: 4,
  recess: 0.012,
  centre: [-1.5, 0.35, 0] as Triple,
} as const;

const HATCH_INSET = 0.035;

function handleRow(xs: readonly number[], z: number): Triple[] {
  return xs.flatMap((x) => [
    [x, z, 0],
    [x, -z, 0],
  ]);
}

export const DECK_ITEMS = {
  slopeStep: 0.05,
  panelFloor: FAIRING.top - FAIRING_SHAPE.recess,
  vent: {
    frame: 0.018,
    inset: 0.014,
    bottom: FAIRING.top,
    capOverhang: 0.008,
    capThickness: 0.012,
    slat: { pitch: 0.022, depth: 0.024, thickness: 0.004, angle: toRadians(35) },
  },
  panel: { edgeUv: 0.02, foot: 0.012, footInset: 0.05, glow: '#8fc4ff' },
  stub: { flange: 0.03, flangeHeight: 0.006, capSamples: 6 },
  dome: {
    ringInner: 0.114,
    ringDepth: 0.03,
    ringRise: 0.01,
    segments: 40,
    capSamples: 10,
    skirt: { flare: 0.004, height: 0.02 },
    window: { lift: 1.012, azimuth: 24, from: 22, to: 62 },
  },
  bowCamera: {
    samples: 14,
    around: 14,
    tailWidth: 0.02,
    tailHeight: 0.004,
    sink: 0.012,
    squareness: 0.55,
    proud: 0.003,
  },
  handle: { washer: 0.011, washerHeight: 0.003, stem: 0.006, barRadius: 0.0045 },
  handleSpots: [
    ...handleRow([1.27, 1.45, 1.63], HATCHES.forward.halfWidth - HATCH_INSET),
    [HATCHES.forward.x[0] + HATCH_INSET, 0, Math.PI / 2],
    [HATCHES.forward.x[1] - HATCH_INSET, 0, Math.PI / 2],
    ...handleRow([-0.02, 0.2, 0.42], HATCHES.mid.halfWidth - HATCH_INSET),
  ] as readonly Triple[],
} as const;

export const WAVES = {
  direction: toRadians(205),
  lengthPerMetre: 30,
  lengthPower: 0.5,
  minHeight: 0.1,
  defaultHeight: 0.3,
  phaseStep: 1.7,
  components: [
    { length: 1, angle: 0, share: 0.24 },
    { length: 0.83, angle: toRadians(-23), share: 0.18 },
    { length: 0.71, angle: toRadians(31), share: 0.15 },
    { length: 0.53, angle: toRadians(-38), share: 0.12 },
    { length: 0.37, angle: toRadians(64), share: 0.1 },
    { length: 0.29, angle: toRadians(-71), share: 0.08 },
    { length: 0.19, angle: toRadians(12), share: 0.08 },
    { length: 0.13, angle: toRadians(-17), share: 0.05 },
  ],
} as const;

export const WET = {
  rise: 0.025,
  fade: 0.06,
  darken: 0.62,
  roughness: 0.22,
  murk: 0.6,
  murkDepth: 0.3,
} as const;

export const SUN_DIRECTION: Triple = [0.172, 0.122, -0.977];

export const LIGHT_RIG = {
  distance: 1000,
  sun: SUN_DIRECTION,
  key: { color: '#ffc58a', intensity: 1.35 },
  fill: { color: '#7f9bb8', intensity: 0.35, direction: [-0.35, 1, 0.45] as Triple },
  rim: { color: '#a9bfdc', intensity: 1.1, direction: [-0.3, 0.16, 0.94] as Triple },
  sky: { color: '#7f9bb8', ground: '#1b2a3a', intensity: 1.75 },
} as const;

export const HAZE = { colour: '#8d9aa6', near: 400, far: 5000 } as const;

export const HIGHLIGHT_DIM = { saturation: 0.55, brightness: 0.66, emissive: 0.4 } as const;

export const SCENE_LIMITS = {
  cameraNear: 0.05,
  cameraFar: 9000,
  maxPolarAngle: Math.PI / 2,
  cameraMinDistance: 1,
  cameraMaxDistance: 2500,
} as const;

export const JET_SHAPE = {
  segments: 40,
  bore: 0.0785,
  housing: {
    ringRadius: 0.112,
    flange: {
      radius: 0.15,
      aft: -2.768,
      bolts: 8,
      boltRadius: 0.135,
      bolt: 0.009,
      boltHead: 0.008,
    },
    bowl: [
      [-2.768, 0.12],
      [-2.8, 0.126],
      [-2.85, 0.125],
      [-2.885, 0.117],
    ] as readonly (readonly [number, number])[],
    aftFace: 0.104,
  },
  nozzle: { wall: 0.007 },
  steering: {
    outer: 0.052,
    inner: 0.045,
    sleeve: 0.057,
    sleeveLength: 0.014,
    pin: { radius: 0.009, height: 0.016 },
    arm: { length: 0.085, width: 0.018, thickness: 0.008, ball: 0.011 },
  },
  impeller: {
    hub: [
      [-2.505, 0.008],
      [-2.515, 0.022],
      [-2.53, 0.032],
      [-2.548, 0.035],
      [-2.585, 0.035],
      [-2.595, 0.029],
    ] as readonly (readonly [number, number])[],
    lead: -2.518,
    chord: 0.064,
    wrap: 1.75,
    sweep: 0.32,
    clearance: 0.002,
    thickness: 0.0032,
    radial: 7,
    along: 12,
    blurOpacity: 0.32,
  },
  stator: {
    cone: [
      [-2.75, 0.036],
      [-2.8, 0.034],
      [-2.86, 0.027],
      [-2.92, 0.014],
      [-2.95, 0.004],
    ] as readonly (readonly [number, number])[],
    lead: -2.755,
    trail: -2.875,
    curl: 0.6,
    thickness: 0.003,
    radial: 5,
    along: 8,
  },
  shaft: { collar: 0.022, collarLength: 0.03, coupler: 0.045, couplerLength: 0.035 },
  grate: { width: 0.008, height: 0.018 },
  duct: {
    rings: 20,
    around: 36,
    wall: 0.008,
    squareness: 0.45,
    entry: [0.22, 1.25] as const,
    pull: [0.38, 0.32] as const,
  },
  bucket: {
    radius: 0.09,
    arc: [toRadians(100), toRadians(290)] as const,
    centre: [-3.165, -0.15] as const,
    thickness: 0.006,
    stow: toRadians(-110),
    arm: { width: 0.022, thickness: 0.008 },
    boss: 0.016,
    bracket: { x: [-3.0, -2.905] as const, bottom: -0.085, thickness: 0.01 },
    samples: [14, 6] as const,
  },
} as const;

export const INTERNALS = {
  clearance: 0.022,
  bay: { foreHalfWidth: 0.27, samples: 10 },
  tank: { samples: 10, fill: 0.58, neck: { x: 0.36, z: 0.2, radius: 0.032, cap: 0.04 } },
  tub: { wall: 0.004, floorLift: 0.058, foamTop: -0.02 },
  engine: {
    sump: { x: [-1.58, -0.87] as const, halfWidth: 0.15, y: [-0.2, -0.06] as const },
    block: { x: [-1.6, -0.85] as const, halfWidth: 0.2, y: [-0.08, 0.06] as const },
    head: { x: [-1.57, -0.88] as const, halfWidth: 0.16, y: [0.06, 0.118] as const },
    cover: { x: [-1.55, -0.9] as const, halfWidth: 0.13, y: [0.118, 0.155] as const },
    rounding: 0.02,
    coilXs: [-1.46, -1.225, -0.99] as const,
    coil: [0.06, 0.03, 0.05] as Triple,
    plenum: { x: [-1.48, -0.97] as const, z: -0.235, y: 0.075, radius: 0.042 },
    runner: { radius: 0.019, from: [-0.155, 0.09] as const },
    throttle: { radius: 0.03, length: 0.06 },
    exhaust: {
      radius: 0.022,
      collector: [-1.0, 0.24, -0.0] as Triple,
      outlet: [-2.755, 0.04, 0.36] as Triple,
    },
    muffler: { centre: [-1.85, 0.0, 0.33] as Triple, radius: 0.06, length: 0.22 },
    flange: { radius: 0.06, length: 0.03 },
    mounts: { xs: [-1.48, -0.97] as const, z: 0.185, size: [0.05, 0.03, 0.04] as Triple },
  },
  tray: { thickness: 0.008 },
  electronics: {
    computer: { x: [-1.5, -1.17] as const, z: [-0.3, -0.04] as const, height: 0.075 },
    router: { x: [-1.08, -0.88] as const, z: [-0.28, -0.12] as const, height: 0.045 },
    power: { x: [-1.18, -0.95] as const, z: [0.06, 0.28] as const, height: 0.045 },
    puck: { x: -0.86, z: 0.2, radius: 0.04, height: 0.02 },
    canister: { x: [-1.46, -1.3] as const, z: 0.24, radius: 0.034 },
  },
  cable: { radius: 0.007, sag: 0.04 },
  detail: {
    runnerRise: 0.03,
    headerShare: 0.6,
    exhaustGrow: 1.2,
    mountRise: 0.02,
  },
  routes: {
    headers: [
      [0, 0.08, 0.16],
      [0, 0.04, 0.215],
    ] as Triple[],
    pipe: [-1.4, 0, 0.25] as Triple,
    tail: [-2.3, 0.02, 0.35] as Triple,
    panels: [
      { from: [-1.4, 0.323, -0.2] as Triple, to: [-2.05, 0.48, -0.1] as Triple },
      { from: [-1.3, 0.323, -0.1] as Triple, to: [-1.55, 0.48, -0.08] as Triple },
      { from: [-1.0, 0.293, -0.2] as Triple, to: [-1.05, 0.48, -0.08] as Triple },
    ],
  },
} as const;

export const SKY = {
  radius: 7000,
  widthSegments: 48,
  heightSegments: 24,
  renderOrder: -10,
  colours: {
    zenith: '#1a2740',
    upper: '#41587a',
    sunHorizon: '#f0a868',
    haze: HAZE.colour,
    glow: '#ffcf94',
    sun: '#fff1d8',
    cloudLit: '#f6c79a',
    cloudShade: '#8b97a8',
  },
  heights: { band: 0.08, upper: 0.32 },
  glow: { tight: 900, broad: 9, tightGain: 2.4, broadGain: 0.45, disc: 0.99985 },
  clouds: {
    cover: 0.68,
    sharpness: 0.22,
    scale: 0.2,
    stretch: 6,
    from: 0.03,
    to: 0.5,
    opacity: 0.55,
  },
} as const;

const THEME_SEA = { deep: THEME.seaDeep, lit: THEME.seaLit, foam: THEME.foam } as const;

export const SEA = {
  rings: 168,
  segments: 128,
  innerRadius: 0.35,
  growth: 1.062,
  snap: 0.5,
  renderOrder: 1,
  colours: {
    deep: THEME_SEA.deep,
    lit: THEME_SEA.lit,
    foam: THEME_SEA.foam,
    scatter: '#2f6b74',
  },
  ripples: {
    size: 256,
    waves: 28,
    seed: 17,
    scales: [0.19, 0.53] as const,
    flow: [
      [0.021, 0.013],
      [-0.017, 0.026],
    ] as const,
    strength: 0.55,
    broad: 0.031,
    fadeFrom: 40,
    fadeTo: 900,
  },
  foam: { size: 128, seed: 23, scale: 0.22, crestFrom: 0.78, crestTo: 1.15 },
  glitter: { sharp: 1400, broad: 90, sharpGain: 7, broadGain: 0.6, farSharp: 60 },
  fresnel: { base: 0.02, power: 5 },
  hullMargin: 0.004,
  plan: { columns: 128, rows: 40, x: [-3, 3] as const, y: [-0.45, 0.9] as const, scale: 0.8 },
} as const;

export const SECTION_LOOK = {
  depth: 1,
  backDepth: 5,
  backReach: 3,
  backRise: 0.5,
  clear: 0.16,
  rim: 0.03,
  edge: 0.3,
  elevation: [20, 35] as const,
  faces: [6, 15] as const,
  soft: 0.6,
  side: [-3, 0] as const,
  deep: '#0a2433',
  glint: '#c6ecf2',
  samples: { along: 96, across: 40 },
  renderOrder: -3,
} as const;

export const MOTION = {
  bow: 2,
  stern: 2.3,
  side: 0.65,
  planedResponse: 0.35,
  heaveDamping: 0.25,
  maxPitch: toRadians(12),
  maxRoll: toRadians(14),
  shipSide: 7,
  shipEnd: 50,
  shipResponse: 0.6,
  swell: 3,
  lag: 1,
  held: 0.12,
} as const;

export const SEA_FOAM: Readonly<Record<'smooth' | 'slight' | 'moderate' | 'rough', number>> = {
  smooth: 0,
  slight: 0.3,
  moderate: 0.65,
  rough: 1,
};

export const WAKE = {
  start: -JET.nozzle.x[1],
  samples: 72,
  length: 320,
  power: 1.7,
  across: 7,
  armAcross: 3,
  lift: 0.03,
  coreHalfWidth: 0.62,
  coreSpread: toRadians(4.5),
  kelvin: toRadians(19.47),
  planedArm: toRadians(10.5),
  armWidth: [0.35, 4] as const,
  armReach: 140,
  fade: { core: 12, wash: 90, arm: 55 },
  speedFrom: [0.4, 9] as const,
  foamScale: 1,
  emphasis: 1.35,
  tint: '#5fb3bd',
  renderOrder: 2,
} as const;

export const HULL_WATER = {
  bow: {
    rows: 16,
    columns: 9,
    length: [0.7, 2.6] as const,
    height: 0.34,
    peakAt: 0.22,
    curl: 0.55,
    spread: 1.8,
    flare: toRadians(18),
    onFrom: [0.5, 4] as const,
    offFrom: [12.5, 16] as const,
    peakKnots: 11,
  },
  waterline: { rows: 28, columns: 3, width: 0.16, from: [0.3, 3] as const },
  stern: {
    rows: 7,
    columns: 10,
    length: 4.2,
    halfWidth: 1.5,
    height: 0.26,
    peak: 0.42,
    width: 0.22,
  },
  spray: {
    rows: 10,
    columns: 9,
    onFrom: [11, 18] as const,
    root: [0.25, 0.9] as const,
    range: [0.6, 2.2] as const,
    up: toRadians(6),
    back: toRadians(50),
    drop: 0.3,
    trail: 1.2,
    skim: 0.02,
  },
  looks: {
    bow: { opacity: 0.95, scroll: 0.5, streaks: 3.5, stretch: 0.5, colour: '#f2f7f8', floor: 0.6 },
    waterline: { opacity: 0.85, scroll: 1.2, streaks: 9, stretch: 0.35, colour: '#eef4f6' },
    stern: { opacity: 0.5, scroll: 0.2, streaks: 2.5, stretch: 0.6, colour: '#e9f1f3' },
    spray: { opacity: 0.85, scroll: 1.6, streaks: 8, stretch: 1.1, colour: '#ffffff' },
  },
  profiles: {
    bow: [0.04, 0.5] as const,
    sheet: [0.1, 0.5] as const,
    line: [0.0, 1.0] as const,
    mound: [0.25, 0.55] as const,
  },
  emphasis: 1.3,
  levels: {
    bowFloor: 0.35,
    sternPeak: 10,
    sternWidth: 3.5,
    sternOn: [4, 7] as const,
    shown: 0.01,
  },
  tuning: {
    hullGap: 0.004,
    lineLift: 0.012,
    bowStart: 0.05,
    bowDecay: 2.4,
    bowFlare: 0.35,
    bowFall: 0.15,
    bowLean: 0.6,
    sternStart: 0.1,
    sternTaper: 1.15,
    sternLift: 0.015,
    anchorBack: 0.4,
    sprayOut: 0.08,
  },
} as const;

export const JET_STREAM = {
  segments: 16,
  rings: 14,
  exitRadius: 0.042,
  spread: 0.09,
  lengthPerSpeed: 0.055,
  length: [0.35, 2.1] as const,
  reverse: { rings: 10, radius: 0.035, length: 0.75, angle: toRadians(35), dive: 0.3, fade: 0.5 },
  look: { opacity: 0.6, scroll: 0, streaks: 3.5, stretch: 1, colour: '#dff3ff' },
  profile: [0.05, 0.55] as const,
  rooster: {
    count: 640,
    size: 0.34,
    life: 0.8,
    aft: 6.5,
    up: 3.6,
    spread: 1.1,
    seed: 41,
    onFrom: [15, 30] as const,
  },
  emphasis: 1.3,
  tuning: {
    reverseOn: 0.5,
    minLength: 0.1,
    throttleFade: 0.2,
    anchorShare: 0.4,
    reverseCentre: [-3.17, -0.15] as const,
    reverseArc: 0.6,
    reverseSink: 0.1,
    reverseGrow: 2.6,
    shown: 0.01,
    jitter: [0.4, 0.45, 0.7, 0.5] as const,
    speedDrift: 0.05,
    lateralGain: 2,
    alpha: 0.22,
  },
} as const;

export const WETTED_BAR = {
  samples: 24,
  width: 0.035,
  tick: 0.14,
  line: 0.012,
  lift: 0.012,
  offset: 0.03,
  below: 0.006,
  colour: '#ffd36b',
} as const;

export const ANIMATION = {
  impellerCap: 5,
  blurFrom: 6,
  rpmToHertz: 1 / 60,
  domeScan: toRadians(38),
  domeRate: 0.28,
  radarRate: 2.1,
} as const;

export const LABEL_SPOTS = {
  chinesX: -1.2,
  railShare: 0.8,
  outboard: 0.04,
  wakeBehind: 5,
  bowOut: 0.45,
} as const;

export const MISSILE_SHAPE = {
  rail: { length: 1.8, height: 0.05, width: 0.07 },
  pylons: [-0.7, 0.62] as const,
  pylonLength: 0.22,
  pylonWidth: 0.05,
  hanger: 0.012,
  profile: [
    [0, 0],
    [0.06, 0.035],
    [0.18, 0.068],
    [0.32, 0.085],
    [2.72, 0.085],
    [2.86, 0.07],
    [2.9, 0.062],
  ] as readonly (readonly [number, number])[],
  segments: 24,
  fins: { root: 0.24, tip: 0.1, span: 0.11, from: 2.58, thickness: 0.006 },
  seekerGrow: 1.02,
} as const;

export interface BeamLook {
  startRadius: number;
  endRadius: number;
  opacity: number;
  core: number;
  glow: boolean;
  dash: { period: number; duty: number; speed: number; logScale: number; floor: number };
  fade: readonly [start: number, end: number];
  segments: number;
}

const BEAM_DASH = { period: 2.4, duty: 0.55, speed: 1.4, logScale: 22, floor: 0.3 } as const;
const BEAM_BASE = { core: 0.8, glow: false, dash: BEAM_DASH, segments: 14 } as const;

export const BEAMS = {
  up: { ...BEAM_BASE, startRadius: 0.06, endRadius: 1.2, opacity: 0.95, fade: [0.003, 0.03] },
  down: { ...BEAM_BASE, startRadius: 1.2, endRadius: 0.6, opacity: 0.9, fade: [0.02, 0.01] },
  labelShare: 0.08,
  panelGlow: 0.55,
} as const satisfies Record<string, BeamLook | number>;

export const GHOST = {
  colour: '#ffffff',
  opacity: 0.16,
  tether: {
    ...BEAM_BASE,
    startRadius: 0.03,
    endRadius: 0.03,
    opacity: 0.7,
    dash: { ...BEAM_DASH, period: 0 },
    fade: [0.01, 0.01],
    segments: 6,
  },
} as const satisfies Record<string, BeamLook | string | number>;

export const COMPANION = {
  segments: 18,
  exit: 0.05,
  stubSides: 6,
  shoulder: Math.SQRT1_2,
} as const;
