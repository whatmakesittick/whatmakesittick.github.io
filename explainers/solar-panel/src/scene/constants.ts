import { BULKHEAD, HOUSE_WALL_BOTTOM_CM, PARAPET, TERRACE } from '../model';

export const ANCHOR_LIFT_CM = 2;

export const FLOOR = { thickness: 2, tile: 50, joint: 0.8 } as const;

export const HOUSE = {
  wallTop: TERRACE.y - FLOOR.thickness,
  bottom: HOUSE_WALL_BOTTOM_CM,
  cornice: { height: 14, reach: 3 },
  plinth: { height: 22, reach: 2 },
} as const;

export const COPING = { height: 4, overhang: 2 } as const;
export const PARAPET_BODY_HEIGHT = PARAPET.height - COPING.height;
export const PARAPET_INNER = {
  x: [TERRACE.x[0] + PARAPET.thickness, TERRACE.x[1] - PARAPET.thickness],
  z: [TERRACE.z[0] + PARAPET.thickness, TERRACE.z[1] - PARAPET.thickness],
} as const;

export const WINDOW = {
  centres: [-195, 150],
  width: 104,
  sill: -205,
  head: -80,
  frame: 6,
  reach: 1.5,
  glassInset: 0.6,
  mullion: 4,
  ledge: { height: 4, reach: 6, overhang: 6 },
} as const;

export const DOWNPIPE = {
  x: TERRACE.x[1] - 8,
  z: TERRACE.z[1] + 6,
  radius: 4,
  hopper: { width: 14, height: 12, depth: 12 },
  segments: 10,
} as const;

export const VENT_PIPE = {
  x: 285,
  z: -190,
  radius: 5.5,
  height: 55,
  cap: { radius: 9, height: 7 },
  segments: 14,
} as const;

export const BULKHEAD_ROOF = {
  thickness: 8,
  overhang: 4,
  bodyTop: BULKHEAD.height - 8,
} as const;

export const DOOR = {
  centreX: -255,
  width: 82,
  height: 200,
  frame: 5,
  frameReach: 2,
  leafReach: 1,
  handle: { offset: 32, y: 100, width: 12, height: 2.4, reach: 4 },
  step: { height: 4, depth: 24, overhang: 8 },
  lamp: { y: 216, width: 14, height: 8, reach: 7 },
} as const;

export const FACE_LAYERS = {
  busbar: [0.02, 0.05],
  ribbon: [0.02, 0.08],
  string: [0.12, 0.15],
  wire: [0.16, 0.19],
  plate: [0.2, 0.3],
  symbol: [0.3, 0.33],
} as const;

export const BUSBARS = {
  halfCut: { count: 10, width: 0.12 },
  fullCell: { count: 4, width: 0.18 },
} as const;

export const BUS_RIBBON = { width: 0.4, margin: 0.6, inset: 1 } as const;

export const STRING_LINE = { width: 0.9, wire: 0.45 } as const;

export const STRING_TINTS = {
  halfCut: ['#4cc3ff', '#9fe3ff', '#8bd47f', '#c9f0a8', '#ffd166', '#ffe9ad'],
  fullCell: ['#4cc3ff', '#8bd47f', '#ffd166'],
} as const;

export const DIODE_GLYPH = {
  width: 6,
  height: 4.2,
  triangle: 1.6,
  tip: 0.7,
  bar: 0.35,
  barAt: 0.85,
} as const;

export const SHADE = { tint: 0.34, bandColor: '#05070c', bandOpacity: 0.5, lift: 0.1 } as const;

export const CELL_WARMTH = { fromC: 50, toC: 75, maxGlow: 0.1 } as const;

export const ENCAPSULANT_SHOWN_ABOVE = 0.02;

export const CABLE = { radius: 0.6, radialSegments: 8, bend: 4, segmentsPerCm: 0.35 } as const;

export const LEAD = {
  radius: 0.5,
  drop: 11,
  sideGap: 3.5,
  tuck: -2,
  crossing: 0.8,
  crossingDrop: 15,
} as const;

export const CONNECTOR = {
  top: 14,
  length: 12,
  radius: 1.1,
  femaleRadius: 1.0,
  nut: { radius: 1.45, length: 1.6 },
} as const;

export const RENDER_ORDER = { sky: -2, ground: -1, glow: 5, rays: 6, particles: 8 } as const;

export const SKY_DOME = { widthSegments: 48, heightSegments: 24, horizonBlend: 0.22 } as const;

export const GROUND = { radius: 2300, segments: 64, fade: 0.55 } as const;

export const ARC_CENTRE = { x: 0, y: 0, z: 0 } as const;

export const SUN_DISC = { hideBelowDeg: -3, textureSize: 128, limb: 0.18 } as const;

export const SUN_GLOW = { size: 560, fadeBelowDeg: -4, fullAboveDeg: 4, opacity: 0.85 } as const;

export const SUN_ARC = {
  radius: 2.4,
  stepMinutes: 10,
  radialSegments: 6,
  tick: { radius: 5, noonRadius: 8, segments: 10 },
  opacity: 0.6,
} as const;

export const RAYS = {
  columns: 3,
  rows: 4,
  inset: 0.18,
  length: 420,
  width: 1.2,
  dashes: 6,
  speed: 0.6,
  opacity: 0.38,
} as const;

export const INVERTER_BODY = {
  radius: 1.6,
  bracket: { inset: 3, depth: 1.2 },
  display: { width: 12, height: 6.5, y: 9, texture: { width: 256, height: 128 } },
  led: { size: 1.4, y: 3, z: 6 },
  stripe: { height: 1.2, y: -14 },
  fins: { count: 7, depth: 1.4, thickness: 0.6, inset: 5 },
  glands: { radius: 1.1, length: 2.4, dc: [-11, -6], ac: [6, 11] },
} as const;

export const METER_BODY = {
  radius: 1,
  window: { width: 14, height: 9, y: 6 },
  screen: { width: 9, height: 3, y: 7 },
  led: { size: 1, y: 2.5, z: 5 },
  cover: { height: 10, y: -9 },
} as const;

export const SLICE_VIEW = {
  pyramid: { baseUm: 8.5, minShare: 0.55, seed: 29 },
  marker: 3.2,
  entryUm: 70,
  exitUm: 40,
  labelLift: 1.5,
} as const;
