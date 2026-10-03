import { toRadians } from '@core/math';
import type { Pose } from '@core/path';
import type { Point } from '../ids';

export type Extent = readonly [min: number, max: number];
export type SectionPoint = readonly [z: number, y: number];

export interface Box {
  x: Extent;
  y: Extent;
  z: Extent;
}

export interface SkyOffset {
  ahead: number;
  up: number;
  side: number;
}

export interface HullStation {
  x: number;
  keel: number;
  deadrise: number;
  chineHalfBreadth: number;
  knuckle: SectionPoint;
  sheer: SectionPoint;
  deck: number;
}

export const BOAT = {
  length: 5.5,
  beam: 1.5,
  freeboard: 0.5,
  halfLength: 2.75,
  staticDraft: 0.32,
  waterlineLength: 5.1,
  chineBeam: 1.3,
  deadriseAft: toRadians(20),
  mass: 1000,
  lensHeight: 0.7,
  cruiseKnots: 22,
  topKnots: 42,
} as const;

export const TRANSOM_X = -BOAT.halfLength;

function station(
  x: number,
  keel: number,
  deadriseDegrees: number,
  chineHalfBreadth: number,
  knuckle: SectionPoint,
  sheer: SectionPoint,
  deck: number,
): HullStation {
  return { x, keel, deadrise: toRadians(deadriseDegrees), chineHalfBreadth, knuckle, sheer, deck };
}

export const HULL_STATIONS: readonly HullStation[] = [
  station(-2.75, -0.32, 20, 0.65, [0.72, 0.08], [0.74, 0.26], 0.31),
  station(-2, -0.32, 20, 0.66, [0.73, 0.09], [0.75, 0.27], 0.32),
  station(-1, -0.32, 20, 0.665, [0.73, 0.1], [0.75, 0.29], 0.34),
  station(0, -0.32, 20, 0.66, [0.73, 0.12], [0.75, 0.33], 0.38),
  station(1, -0.3, 26, 0.62, [0.7, 0.17], [0.72, 0.38], 0.43),
  station(1.6, -0.24, 33, 0.54, [0.62, 0.23], [0.64, 0.42], 0.47),
  station(2.1, -0.14, 42, 0.4, [0.48, 0.32], [0.5, 0.46], 0.5),
  station(2.4, 0.02, 50, 0.26, [0.3, 0.41], [0.32, 0.49], 0.52),
];

export function chineHeight(hullStation: HullStation): number {
  return hullStation.keel + hullStation.chineHalfBreadth * Math.tan(hullStation.deadrise);
}

export const STEM = {
  forefoot: [2.35, -0.05] as const,
  top: [BOAT.halfLength, 0.52] as const,
  chineMeetsAt: 0.5,
} as const;

export function stemXAt(y: number): number {
  const [x0, y0] = STEM.forefoot;
  const [x1, y1] = STEM.top;
  return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
}

export const HULL_DETAIL = {
  keelStraightTo: 0.5,
  chineFlat: { width: 0.03, endX: 2.3 },
  sprayRail: { width: 0.025, x: [0.2, 2.45] as Extent },
  knuckleMergeX: 2.55,
  deckCentreWidth: 0.6,
  edgeBandDepth: 0.05,
} as const;

export const FAIRING = {
  x: [-2.62, -0.3] as Extent,
  frontTopX: -0.62,
  top: 0.5,
  topHalfWidth: 0.5,
  baseHalfWidth: 0.62,
} as const;

export const VENT_BOX = { x: [-2.58, -2.32] as Extent, halfWidth: 0.18, top: 0.65 } as const;

export const PANEL = {
  length: 0.4,
  width: 0.6,
  thickness: 0.04,
  raise: 0.01,
  frameLength: 0.46,
  frameWidth: 0.66,
  top: 0.55,
} as const;

export const BACKUP_PANEL_X = -2.05;
export const STARLINK_PANEL_XS = [-1.55, -1.05] as const;

export const STUB = { x: -0.12, radius: 0.02, height: 0.14 } as const;

export const DOME = {
  x: 0.92,
  base: 0.426,
  ringRadius: 0.14,
  radius: 0.11,
  height: 0.2,
  top: 0.736,
  lens: BOAT.lensHeight,
} as const;

export const HATCHES = {
  forward: { x: [1.15, 1.75] as Extent, halfWidth: 0.26, handles: 8 },
  mid: { x: [-0.15, 0.55] as Extent, halfWidth: 0.3, handles: 6 },
  recess: 0.01,
  handle: { bar: 0.04, stem: 0.02 },
} as const;

export const BOW_CAMERA = {
  x: [2.12, 2.42] as Extent,
  width: 0.16,
  height: 0.1,
  window: { width: 0.08, height: 0.05, y: 0.58 },
} as const;

export const PAYLOAD_BAY = {
  bulkheads: [0.75, 2.05] as Extent,
  box: { x: [0.85, 1.95] as Extent, halfWidth: 0.38, y: [-0.18, 0.36] as Extent },
} as const;

export const FUEL_TANKS = {
  x: [-0.55, 0.55] as Extent,
  centreZ: 0.27,
  width: 0.42,
  y: [-0.12, 0.2] as Extent,
} as const;

export const ENGINE_TUB = {
  x: [-1.85, -0.65] as Extent,
  halfWidth: 0.42,
  y: [-0.26, 0.22] as Extent,
} as const;

export const ENGINE = {
  x: [-1.6, -0.85] as Extent,
  halfWidth: 0.22,
  y: [-0.2, 0.16] as Extent,
  couplerX: -1.65,
} as const;

export const ELECTRONICS = {
  x: [-1.55, -0.75] as Extent,
  halfWidth: 0.35,
  y: [0.24, 0.44] as Extent,
} as const;

export const IMPELLER = {
  x: -2.55,
  diameter: 0.155,
  hubRadius: 0.035,
  blades: 3,
  statorVanes: 7,
} as const;

export const JET = {
  axisY: -0.15,
  intake: { x: [-2.25, -1.75] as Extent, halfWidth: 0.11, bars: 5, y: -0.3 },
  duct: { endX: -2.5, innerDiameter: 0.157 },
  shaft: { x: [-2.55, -1.65] as Extent, radius: 0.0125, entryX: -2.15 },
  housing: { x: [-2.9, -2.5] as Extent, outerDiameter: 0.24 },
  stator: { x: [-2.88, -2.75] as Extent },
  nozzle: { x: [-3, -2.9] as Extent, inletDiameter: 0.16, exitDiameter: 0.09 },
  steeringNozzle: { x: [-3.12, -3] as Extent, pivotX: -3 },
  bucket: { pivot: [-2.98, -0.02] as const, width: 0.22, depth: 0.18 },
} as const;

export const MISSILE_FIT = {
  railZ: 0.52,
  x: [-0.9, 0.9] as Extent,
  railTop: 0.62,
  raise: toRadians(8),
  missile: { length: 2.9, diameter: 0.17 },
} as const;

export const BOAT_BOUNDS: Box = { x: [-3.25, 2.75], y: [-0.35, 0.8], z: [-0.75, 0.75] };

export const WATER_SECTION = {
  x: [-3.4, 3.1] as Extent,
  z: [-2.6, 0] as Extent,
  depth: 1.2,
} as const;

export const SHORELINE_X = 0;

export const SLIPWAY = {
  x: [-22, 3] as Extent,
  z: [-2, 2] as Extent,
  top: 1.5,
  foot: -0.4,
} as const;

export const START: Pose = { x: 6, z: 0, heading: 0 };

export const ROUTE_TURN = { lead: 180, radius: 350, turn: -toRadians(20) } as const;

export const FINAL_HEADING = START.heading + ROUTE_TURN.turn;

export const SHIP = {
  length: 110,
  beam: 14,
  draft: 4,
  deck: 6,
  bridgeTop: 15,
  mastTop: 30,
  radarHeight: 20,
  mastX: 12,
  reach: 62,
} as const;

export const GROUND_STATION: Point = [-70, 3, -60];

export const SATELLITE_OFFSET: SkyOffset = { ahead: 800, up: 360, side: -70 };
export const BACKUP_SATELLITE_OFFSET: SkyOffset = { ahead: 860, up: 430, side: 60 };

export function skyPoint(position: Point, offset: SkyOffset): Point {
  const aheadX = Math.cos(FINAL_HEADING);
  const aheadZ = Math.sin(FINAL_HEADING);
  return [
    position[0] + offset.ahead * aheadX - offset.side * aheadZ,
    offset.up,
    position[2] + offset.ahead * aheadZ + offset.side * aheadX,
  ];
}

export const FORMATION = { back: 30, side: 18, joinSide: 120, joinStart: 70, joinEnd: 84 } as const;

export const SCENE_BOUNDS: Box = { x: [-150, 1550], y: [-6, 40], z: [-550, 150] };
export const SHORE_BOUNDS: Box = { x: [-80, 20], y: [-1, 8], z: [-70, 30] };
