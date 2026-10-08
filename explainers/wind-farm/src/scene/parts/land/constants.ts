import type { GroundPoint } from '../../../model/layout';

type Range = readonly [number, number];
type Triple = readonly [number, number, number];

export const GROUND_TEXTURE = {
  size: 2048,
  anisotropy: 8,
  minLinePx: 1.1,
  minStripePx: 3,
  strokePiece: 60,
  fadeStops: 8,
  farm: { softness: 2600, step: 150 },
  turbine: { softness: 300, step: 20 },
  mottle: [
    { cells: 40, amount: 0.2, seed: 3 },
    { cells: 320, amount: 0.12, seed: 5 },
  ],
} as const;

export const MOWING = { width: 7, reach: 150, fade: 0.6, shade: 1.12, alpha: 0.5 } as const;

export const TURBINE_GROUND = {
  firstRingStep: 2,
  segments: 240,
  meadow: { colour: '#97b565', inner: 90, outer: 170 },
  hedgeClear: 120,
  woodClear: 260,
  hazeFrom: 0.7,
  alphaFrom: 0.9,
} as const;

export const FARM_GROUND = { segments: 180, hazeFade: 1500, alphaFade: 450 } as const;

export const LAND_RENDER_ORDER = -1;

export const HARDSTAND = {
  pad: { minX: -20, maxX: 20, minZ: 8, maxZ: 33 },
  apronRadius: 10,
  corner: 3,
  lift: 0.05,
  arcSegments: 32,
} as const;

export const TRACK = {
  points: [
    [0, 30],
    [0, 120],
    [60, 320],
    [210, 700],
    [260, 1100],
    [520, 1700],
    [700, 2400],
    [880, 3100],
  ] satisfies GroundPoint[],
} as const;

export interface TreeLayout {
  readonly hedgeCount: number;
  readonly woodCount: number;
  readonly hedgeBand: number;
  readonly cluster: { readonly wavelength: number; readonly threshold: number };
  readonly scale: Range;
  readonly woodScale: Range;
  readonly attempts: number;
  readonly sink: number;
  readonly seed: number;
}

export const TURBINE_TREES: TreeLayout = {
  hedgeCount: 280,
  woodCount: 190,
  hedgeBand: 4,
  cluster: { wavelength: 140, threshold: 0.45 },
  scale: [0.8, 1.35],
  woodScale: [1, 1.5],
  attempts: 200_000,
  sink: 0,
  seed: 41,
};

export const TURBINE_TREE_LIMITS = { reach: 2100, heroClear: 150, trackClear: 18 } as const;

export const FARM_TREES: TreeLayout = {
  hedgeCount: 950,
  woodCount: 650,
  hedgeBand: 10,
  cluster: { wavelength: 420, threshold: 0.45 },
  scale: [1.2, 2],
  woodScale: [1.5, 2.4],
  attempts: 400_000,
  sink: 1.2,
  seed: 43,
};

export const FARM_TREE_LIMITS = {
  edgeMargin: 1300,
  siteClear: 160,
  routeClear: 45,
  substationClear: 140,
  gridClear: 45,
} as const;

export interface Lobe {
  readonly centre: Triple;
  readonly radius: number;
  readonly detail: number;
}

export const TREE_SHAPE = {
  trunk: { top: 0.22, bottom: 0.34, height: 5.4, sink: 1.2, sides: 5 },
  crown: [
    { centre: [0, 6.8, 0], radius: 3.3, detail: 1 },
    { centre: [1.9, 5.7, 0.8], radius: 2.4, detail: 1 },
    { centre: [-1.4, 5.5, -1.3], radius: 2.2, detail: 0 },
  ] satisfies Lobe[],
  clump: [
    { centre: [0, 3.4, 0], radius: 4.2, detail: 0 },
    { centre: [3.6, 2.6, 1.4], radius: 3.2, detail: 0 },
    { centre: [-2.8, 2.4, -2.6], radius: 3, detail: 0 },
  ] satisfies Lobe[],
  squash: 0.86,
} as const;

export const TREE_TINT = {
  lightness: [0.8, 1.16] as Range,
  warmth: 0.08,
  autumnShare: 0.05,
  autumn: [1.3, 1.08, 0.7] as Triple,
  trunk: [1.25, 0.78, 0.92] as Triple,
  stretch: [0.85, 1.2] as Range,
} as const;

export const SKY_DOME = {
  widthSegments: 48,
  heightSegments: 24,
  renderOrder: -10,
  rise: 2.6,
  band: 0.07,
  ground: { colour: '#b8c8aa', minHeight: 2, band: 0.025 },
  glow: {
    colour: '#f7dbb1',
    wide: 0.3,
    wideTightness: 5,
    core: 0.5,
    coreTightness: 260,
    horizon: 0.25,
    horizonTightness: 3,
  },
} as const;

export const LAND_LABELS = {
  land: [-70, 70],
  farmLand: [2800, -2200],
} as const satisfies Record<string, GroundPoint>;
