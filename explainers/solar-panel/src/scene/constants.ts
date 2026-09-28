import type { PartId } from '../ids';
import { BULKHEAD, HOUSE_WALL_BOTTOM_CM, PARAPET, TERRACE } from '../model';

export const ANCHOR_LIFT_CM = 2;

export const HERO_PANEL_PARTS: readonly PartId[] = [
  'panel',
  'frame',
  'glass',
  'encapsulant',
  'cell',
  'ribbon',
  'busbar',
  'backsheet',
  'junctionBox',
  'bypassDiode',
];

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

export const NIGHT_LIGHTS = {
  darkAboveDeg: 4,
  fullBelowDeg: -6,
  window: 0.45,
  lamp: 1.6,
  color: '#ffcf8a',
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
  busbar: [0.03, 0.06],
  ribbon: [0.03, 0.1],
  string: [0.16, 0.2],
  wire: [0.21, 0.24],
  plate: [0.25, 0.34],
  symbol: [0.34, 0.37],
} as const;

export const BUSBARS = {
  halfCut: { count: 10, width: 0.12 },
  fullCell: { count: 4, width: 0.18 },
} as const;

export const DETAIL_DISTANCE_CM = 900;

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

export const CELL_WARMTH = { fromC: 58, toC: 75, maxGlow: 0.12 } as const;

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

export const GROUND = {
  radius: 1600,
  segments: 64,
  fadeFrom: 0.35,
  shadow: { spread: 1.5, opacity: 0.55, lift: 0.5 },
} as const;

export const ARC_CENTRE = { x: 0, y: 0, z: 0 } as const;

export const SKY_VIEW = { direction: [0, 0.18, -1], margin: 1.04, stepMinutes: 20 } as const;

export const SUN_DISC = {
  hideBelowDeg: -3,
  textureSize: 128,
  limb: 0.18,
  screenScale: 0.035,
} as const;

export const SUN_GLOW = {
  screenScale: 0.16,
  fadeBelowDeg: -4,
  fullAboveDeg: 4,
  opacity: 0.85,
} as const;

export const SUN_ARC = {
  stepMinutes: 10,
  linePixels: 2.5,
  tickPixels: 9,
  noonPixels: 14,
  opacity: 0.8,
} as const;

export const RAYS = {
  columns: 3,
  rows: 4,
  inset: 0.18,
  length: 320,
  width: 1.1,
  dashes: 5,
  speed: 0.6,
  opacity: 0.3,
} as const;

export const FACE_RELIEF = {
  sink: 0.1,
  screen: 0.05,
  stripe: 0.15,
  led: 0.5,
  window: 0.15,
  lcd: 0.25,
  cover: 0.6,
} as const;

export const INVERTER_BODY = {
  radius: 1.6,
  finInset: 3,
  display: { width: 12, height: 6.5, y: 9, texture: { width: 256, height: 128 } },
  led: { size: 1.4, y: 3, z: 6 },
  stripe: { height: 1.2, y: -14 },
  fins: { count: 7, depth: 1.4, thickness: 0.6, inset: 5 },
  glands: { radius: 1.1, length: 2.4, dc: [-11, -6], ac: [6, 11] },
  plugs: { radius: 1.05, length: 4.6, nut: { radius: 1.45, length: 1 } },
} as const;

export const METER_BODY = {
  radius: 1,
  window: { width: 14, height: 9, y: 6 },
  screen: { width: 9, height: 3, y: 7 },
  led: { size: 1, y: 2.5, z: 5 },
  cover: { height: 10, y: -9, inset: 1 },
} as const;

export const SLICE_VIEW = {
  pyramid: { baseUm: 8.5, minShare: 0.55, seed: 29 },
  marker: 3.2,
  entryUm: 70,
  exitUm: 40,
  labelLift: 1.5,
  sectionDepth: 14,
  framedWidthShare: 0.62,
} as const;

export const DC_ROUTE = {
  floorY: 2.2,
  runZ: 48,
  trayX: -182,
  wallX: -186.5,
  wallFoot: 7,
  glandRise: 9,
} as const;

export const AC_ROUTE = { wallX: -186.5, drop: 8, wallEntry: 9 } as const;

export const TRAY = { width: 7, height: 4, wall: 0.4, overrun: 5 } as const;

export const CLIP = { size: 2.2, depth: 1.6, spacing: 22 } as const;

export const FLOW = {
  dc: { count: 28, seed: 11 },
  ac: { count: 16, seed: 23 },
  minSpeed: 12,
  maxSpeed: 70,
  samples: 240,
  fadeShare: 0.04,
  sizePerDistance: 0.0045,
  minSize: 2.5,
  maxSize: 9,
  color: '#ffb347',
} as const;

export const CELL_VIEW_DIRECTION = [-0.45, 0.4, 1] as const;

export const SLICE_FLOW = {
  faceGap: 0.5,
  siliconIndex: 3.9,
  photon: { pool: 30, trail: 10, spacing: 0.6, speed: 40, size: 3.6, halo: 3, maxRate: 12 },
  carrier: { pool: 64, speed: 10, size: 5.4, fade: 0.45, wiggle: 0.7, wiggleRate: 7 },
  edgeMarginUm: 20,
  depthJitter: 0.18,
  referenceDistance: 420,
  maxScale: 3,
  seed: 5,
} as const;
