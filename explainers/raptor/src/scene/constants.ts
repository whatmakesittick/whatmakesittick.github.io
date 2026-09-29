import {
  CHAMBER,
  INLETS,
  COOLANT_MANIFOLD,
  HOT_GAS_MANIFOLD,
  INJECTOR,
  NOZZLE_EXIT,
  THROAT,
  THRUST_MOUNT,
} from '../model';
import type { ProfilePoint } from './geometry/revolve';

export const SEGMENTS = {
  body: 64,
  part: 36,
  small: 16,
  tube: 12,
  cluster: 20,
  clusterSide: 10,
} as const;

export const WALL_LAYERS = { liner: 1, channel: 1, jacket: 1 } as const;
export const WALL_OUTSET = WALL_LAYERS.liner + WALL_LAYERS.channel + WALL_LAYERS.jacket;
export const CHANNEL_RECESS = 0.4;
export const WALL_SAMPLES = 64;

export const SECTION_BOUNDS = {
  chamber: [CHAMBER.bottom, INJECTOR.y],
  throat: [-165, CHAMBER.bottom],
  nozzle: [NOZZLE_EXIT.y, -165],
} as const satisfies Record<string, readonly [number, number]>;

export const HEAT_RANGE: readonly [number, number] = [NOZZLE_EXIT.y, INJECTOR.y];

export const MOUNT = {
  bevel: 1.5,
  notchRadius: INLETS.oxygen.radius + 2.5,
  notchCentre: Math.abs(INLETS.oxygen.centre[0]),
  outlineSteps: 160,
  boltCircle: 30.5,
  boltCount: 18,
  boltRadius: 1.3,
  boltHeight: 1.6,
  top: THRUST_MOUNT.top,
  bottom: THRUST_MOUNT.bottom,
  radius: THRUST_MOUNT.radius,
} as const;

export const SOCKET_OUTLINE: readonly ProfilePoint[] = [
  [17, -5],
  [20.5, -6],
  [22, -8.5],
  [22, -11.5],
  [13, -12.5],
  [15.2, -9.6],
  [16.8, -6.8],
];

export const BODY_OUTER: readonly ProfilePoint[] = [
  [20.5, -12],
  [25, -13.6],
  [27.8, -16],
  [28.8, -18.6],
  [28.6, -21.6],
  [24.5, -24],
  [21, -26.5],
  [22.2, -30.5],
  [20, -34.5],
  [19.6, -40],
  [19.6, -45.5],
  [21.4, -49.5],
  [19.6, -53.5],
  [19.4, -60],
  [19.4, -67.5],
  [21.2, -71.5],
  [19.6, -75.5],
  [19.4, -81],
  [20.5, -85.5],
];

export const BODY_INNER: readonly ProfilePoint[] = [
  [17, -86.5],
  [17.4, -80],
  [17.4, -40],
  [18, -28],
  [24, -21.2],
  [24.6, -19],
  [21, -15.2],
  [17, -13.6],
];

export const INJECTOR_DOME = {
  outer: [
    [0.01, -73.5],
    [9, -75.5],
    [15, -79.5],
    [17.4, -84],
  ],
  inner: [
    [17.4, -86.2],
    [14, -82.6],
    [8, -78.4],
    [0.01, -76.3],
  ],
} as const satisfies { outer: readonly ProfilePoint[]; inner: readonly ProfilePoint[] };

export const INJECTOR_FACE = {
  top: INJECTOR.y + 1.3,
  bottom: INJECTOR.y - 1.3,
  radius: INJECTOR.radius + 0.4,
  rings: [3.2, 6.4, 9.6, 12.8, 16],
  firstRingCount: 6,
  elementRadius: 0.75,
  elementHeight: 1.4,
} as const;

export const FLANGE_BOLTS = { radius: 27.6, y: -18.4, count: 28, size: 0.95, height: 1.4 } as const;
export const COLLAR_BOLTS = { radius: 29.6, y: -163.5, count: 24, size: 0.9, height: 1.2 } as const;

export const CHAMBER_HOUSING: readonly ProfilePoint[] = [
  [24.4, -85],
  [26.5, -97.5],
  [26.6, -102],
  [24.6, -105.5],
  [24.2, -110],
  [26.2, -114],
  [26.2, -118.5],
  [24.2, -122],
  [23.2, -127],
  [22.4, -130],
];

export const NECK_HOUSING: readonly ProfilePoint[] = [
  [22.4, -130],
  [21, -133],
  [19.4, -137],
  [21, -140.5],
  [20.6, -143.5],
  [18.2, -146.5],
  [17.4, -151],
  [18, -155.5],
  [20, -159],
  [21.5, -161.5],
];

export const COLLAR_OUTER: readonly ProfilePoint[] = [
  [21.5, -161.5],
  [28.5, -162.2],
  [30.6, -163.6],
  [30.6, -167.8],
  [28.8, -169.4],
];

export const COLLAR_BOTTOM_Y = -170.5;
export const BELL_TOP_Y = -165;
export const EXIT_LIP = { height: 2.2, rounding: 1.2 } as const;

export const HOT_GAS_RING = {
  y: HOT_GAS_MANIFOLD.y,
  radius: HOT_GAS_MANIFOLD.radius,
  tube: HOT_GAS_MANIFOLD.tube,
  bore: HOT_GAS_MANIFOLD.tube - 1.8,
  steps: 28,
} as const;

export const COOLANT_RING = {
  y: COOLANT_MANIFOLD.y,
  radius: COOLANT_MANIFOLD.radius,
  tube: COOLANT_MANIFOLD.tube,
  steps: 20,
} as const;

export const PUMP_TEMPLATE = {
  top: -28,
  bottom: -88,
  radius: 16,
  outer: [
    [11, -28],
    [13.6, -29.8],
    [16, -33.4],
    [16.6, -38],
    [16, -42.8],
    [13.2, -46],
    [11.6, -49.5],
    [11.6, -66.5],
    [13.2, -70],
    [15.6, -73],
    [16.2, -78],
    [15.6, -83],
    [12.2, -86.4],
    [7.6, -88],
  ],
  inner: [
    [5.8, -88],
    [10.4, -86],
    [13.8, -82.8],
    [14.2, -78],
    [13.8, -73.4],
    [9.8, -68.5],
    [9.8, -49.5],
    [11.2, -46],
    [14, -42.8],
    [14.6, -38],
    [14, -34],
    [11.6, -30.6],
    [9.6, -29.2],
  ],
} as const satisfies {
  top: number;
  bottom: number;
  radius: number;
  outer: readonly ProfilePoint[];
  inner: readonly ProfilePoint[];
};

export const PREBURNER_TEMPLATE = {
  top: -46,
  bottom: -82,
  radius: 9,
  outer: [
    [3.6, -44.2],
    [7.6, -45.2],
    [10, -46.4],
    [10.2, -48.8],
    [9, -50.4],
    [9, -58],
    [9.6, -60],
    [9, -62],
    [9, -74],
    [8.4, -77.2],
    [6.4, -80.6],
    [4.8, -82],
  ],
  inner: [
    [3.2, -82],
    [5, -80.2],
    [6.9, -77.2],
    [7.4, -74],
    [7.4, -51],
    [6.6, -48.6],
    [2.6, -47.4],
  ],
} as const satisfies {
  top: number;
  bottom: number;
  radius: number;
  outer: readonly ProfilePoint[];
  inner: readonly ProfilePoint[];
};

export const INLET = {
  top: THRUST_MOUNT.top,
  flange: 3,
  flangeWidth: 3,
  bellowsTop: 11,
  bellowsBottom: -5,
  bellowsPitch: 2,
  bellowsSwell: 1.4,
  wall: 1.6,
  bottom: -29,
} as const;

export const ROTOR = {
  shaftRadius: 2.1,
  hubRadius: 3.2,
  inducer: { top: -30.5, bottom: -35.5, tip: 8.4, blades: 3, twist: Math.PI * 1.2 },
  impeller: { top: -37, bottom: -44, tip: 13.2, vanes: 9, hubTop: 4, hubBottom: 12.4 },
  turbine: { top: -78.2, bottom: -81.6, disc: 10.6, tip: 13.4, blades: 34 },
  bladeThickness: 0.45,
} as const;

export const ACTUATOR = {
  bodyRadius: 3.1,
  rodRadius: 1.5,
  bodyShare: 0.56,
  eyeRadius: 2.4,
  lugDepth: 4,
  bracketRadius: 2.2,
} as const;

export const DUCT_RADIUS = {
  discharge: 4.2,
  hotGas: 4.6,
  turbineExhaust: 5.6,
  coolantLine: 2.6,
  coolantReturn: 3,
  domeDuct: 3.6,
  bleed: 1.5,
} as const;

export const SPIN = { turnsPerSecond: 4, maxStepSeconds: 1 } as const;

export const PLUME = {
  radialSegments: 48,
  lengthSegments: 120,
  clusterRadialSegments: 24,
  clusterLengthSegments: 48,
  growth: 0.55,
  minLength: 1,
  exitGlowSize: 150,
  diamondLength: 0.75,
  diamondRadius: 0.3,
  maxDiamonds: 8,
  firstDiamond: 0.6,
  crowdedDiamonds: 0.3,
  columnShare: 0.22,
  columnRadius: 330,
  columnLength: 0.75,
  lightOffset: 70,
  lightIntensity: 60_000,
  clusterLightIntensity: 1_500_000,
  clusterLightDepth: 700,
  clusterShare: 0.32,
} as const;

export const CHAMBER_FLAME = {
  top: INJECTOR.y - 1,
  bottom: THROAT.y - 30,
  share: 0.86,
  samples: 40,
} as const;

export const FLOW = {
  liquidSize: 2.4,
  gasSize: 3.6,
  liquidSpeed: 110,
  gasSpeed: 170,
  liquidSpread: 1.1,
  gasSpread: 2,
  lift: 1.4,
  dimmedShare: 0.3,
  samplesPerPath: 400,
  maxStepSeconds: 1,
  seed: 29,
  counts: { liquidOxygen: 520, liquidMethane: 680, oxygenRichGas: 460, methaneRichGas: 460 },
} as const;

export const GLOW = {
  chamber: 0.7,
  throat: 1.1,
  nozzle: 0.8,
  preburnerFlash: 3,
  preburnerFlashSeconds: 0.6,
  preburnerCavity: 0.12,
  cluster: 2,
} as const;

export const ANCHOR_LIFT = 4;
export const PLUME_LABEL_DEPTH = 400;

export const BOOSTER_PARTS = {
  shieldHoleMargin: 12,
  shieldThickness: 6,
  skirtSegments: 96,
  ringCount: 6,
  stringerCount: 48,
} as const;

export const SURFACES = {
  brushed: { size: 128, repeat: [6, 3], streakStrength: 0.35, seed: 11 },
  channels: { width: 32, repeat: 24, ribs: 4, depth: 0.6 },
  panels: { size: 64, repeat: [48, 6], seam: 0.9, grain: 0.03, seed: 5 },
  heat: {
    height: 128,
    keys: [
      [0, 0.02],
      [0.3, 0.06],
      [0.6, 0.4],
      [0.735, 1],
      [0.85, 0.8],
      [1, 0.6],
    ],
  },
} as const;

export const SKY = {
  radius: 20000,
  widthSegments: 48,
  heightSegments: 24,
  renderOrder: -10,
  topKm: 60,
  dipExaggeration: 2.2,
  sunDirection: [-1, -0.08, -0.35],
  haze: [0.14, 0.03],
  hazeGoneKm: 30,
  duskStars: 0.04,
  starsFrom: 18,
  starsFull: 42,
  lightsGoneKm: 3,
  shoreFadeKm: [4, 20],
  zenith: [
    [0, '#13213f'],
    [8, '#0f1936'],
    [25, '#0a0c26'],
    [45, '#030410'],
  ],
  horizon: [
    [0, '#302e48'],
    [10, '#27335a'],
    [30, '#16275a'],
    [50, '#0a1230'],
  ],
  ground: [
    [0, '#0a121d'],
    [10, '#0a1424'],
    [40, '#0b1a30'],
  ],
  glow: [
    [0, '#7a4632'],
    [15, '#5a3a52'],
    [40, '#1e2a55'],
  ],
  limb: [
    [0, '#000000'],
    [15, '#101f44'],
    [40, '#3f7fe0'],
  ],
} as const satisfies {
  zenith: readonly (readonly [number, string])[];
  horizon: readonly (readonly [number, string])[];
  ground: readonly (readonly [number, string])[];
  glow: readonly (readonly [number, string])[];
  limb: readonly (readonly [number, string])[];
  [key: string]: unknown;
};
