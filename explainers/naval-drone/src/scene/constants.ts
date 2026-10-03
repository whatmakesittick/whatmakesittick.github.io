import { toRadians } from '@core/math';
import { FAIRING, HATCHES } from '../model/layout';

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
    streaks: { count: 70, alpha: 0.012, length: [0.15, 0.5] as const },
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
  segments: { small: 10 },
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
    frame: { lift: 1.006, azimuth: 30, from: 15, to: 68 },
  },
  bowCamera: {
    samples: 14,
    around: 14,
    tailWidth: 0.02,
    tailHeight: 0.004,
    sink: 0.012,
    squareness: 0.55,
    bezel: { proud: 0.003, border: 0.009 },
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
    { length: 1, angle: 0, share: 0.42 },
    { length: 0.63, angle: toRadians(28), share: 0.24 },
    { length: 0.41, angle: toRadians(-34), share: 0.16 },
    { length: 0.27, angle: toRadians(55), share: 0.11 },
    { length: 0.17, angle: toRadians(-62), share: 0.07 },
  ],
} as const;

export const WET = { rise: 0.025, fade: 0.06, darken: 0.62, roughness: 0.22 } as const;

export const SUN_DIRECTION: Triple = [0.172, 0.122, -0.977];

export const LIGHT_RIG = {
  distance: 1000,
  sun: SUN_DIRECTION,
  key: { color: '#ffc58a', intensity: 1.9 },
  fill: { color: '#7f9bb8', intensity: 0.55, direction: [-0.35, 1, 0.45] as Triple },
  rim: { color: '#a9bfdc', intensity: 1.1, direction: [-0.3, 0.16, 0.94] as Triple },
  sky: { color: '#7f9bb8', ground: '#1b2a3a', intensity: 1.6 },
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
  smallSegments: 12,
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
    blurFrom: 6,
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
    stow: toRadians(-76),
    arm: { width: 0.022, thickness: 0.008 },
    boss: 0.016,
    bracket: { x: [-3.0, -2.905] as const, bottom: -0.085, thickness: 0.01 },
    samples: [14, 6] as const,
  },
} as const;
