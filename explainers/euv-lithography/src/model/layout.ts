import type { RegionSpec } from '@core/scene/regions';
import type { AnchorId, OpticsId, PartId, Point, RegionId } from '../ids';
import { MASK_PATTERN_M, MASK_PLATE_M, WAFER_DIAMETER_M } from './constants';
import type { Box } from './scale';

export const WAYPOINT_IDS = [
  'nozzle',
  'plasma',
  'collector',
  'focus',
  'i1',
  'i2',
  'i3',
  'i4',
  'mask',
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'wafer',
] as const;
export type WaypointId = (typeof WAYPOINT_IDS)[number];

export interface Waypoint {
  id: WaypointId;
  point: Point;
  bounce: boolean;
}

export const FLOOR_Y = 0;

export const DRIVE_LASER_ROOM: Box = { centre: [-6.5, -2.2, 0], size: [3, 2, 3] };
export const BEAM_TRANSPORT: readonly Point[] = [
  [-6.5, -2.2, 0],
  [-6.5, 1.2, 0],
  [-3.9, 1.2, 0],
  [-3, 1.2, 0],
];
export const VESSEL = { xRange: [-4.3, -0.3], centreY: 1.2, radius: 0.9 } as const;
export const DROPLET_GENERATOR: Box = { centre: [-3, 2.85, 0], size: [0.5, 0.5, 0.5] };
export const COLLECTOR = { apexX: -3.9, rimX: -2.4, rimRadius: 0.7 } as const;
export const MASK_STAGE: Box = { centre: [3, 5, 0], size: [1, 0.6, 1] };
export const PROJECTION_BOX: Box = { centre: [3.6, 2.15, 0], size: [1.4, 2.9, 1.6] };
export const WAFER_STAGE: Box = { centre: [3.9, 0.15, 0], size: [1, 0.3, 1] };
export const MASK = {
  plateM: MASK_PLATE_M,
  patternM: MASK_PATTERN_M,
  offNormalDeg: 6,
} as const;
export const WAFER = { diameterM: WAFER_DIAMETER_M } as const;

export const BEAM_WAYPOINTS: readonly Waypoint[] = [
  { id: 'nozzle', point: [-3, 2.6, 0], bounce: false },
  { id: 'plasma', point: [-3, 1.2, 0], bounce: false },
  { id: 'collector', point: [-3.5, 1.75, 0], bounce: false },
  { id: 'focus', point: [-0.5, 1.2, 0], bounce: false },
  { id: 'i1', point: [0.5, 1.2, 0], bounce: true },
  { id: 'i2', point: [0.5, 3, 0], bounce: true },
  { id: 'i3', point: [1.7, 3.2, 0], bounce: true },
  { id: 'i4', point: [2.83, 3, 0], bounce: true },
  { id: 'mask', point: [3, 4.6, 0], bounce: true },
  { id: 'p1', point: [3.13, 3.4, 0], bounce: true },
  { id: 'p2', point: [3.9, 2.9, 0], bounce: true },
  { id: 'p3', point: [3.2, 2.4, 0], bounce: true },
  { id: 'p4', point: [3.9, 1.9, 0], bounce: true },
  { id: 'p5', point: [3.2, 1.4, 0], bounce: true },
  { id: 'p6', point: [3.9, 0.9, 0], bounce: true },
  { id: 'wafer', point: [3.9, 0.3, 0], bounce: false },
];

export function waypoint(id: WaypointId): Point {
  const found = BEAM_WAYPOINTS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown waypoint ${id}`);
  return found.point;
}

const MIRROR_ILLUMINATOR_M = 0.3;
const MIRROR_PROJECTION_M = 0.25;
const LAST_MIRROR_M: Readonly<Record<OpticsId, number>> = { na033: 0.4, na055: 0.55 };
const SMALL_MIRRORS: ReadonlySet<WaypointId> = new Set(['i4', 'p1', 'p2', 'p3', 'p4', 'p5']);

export function mirrorSizeM(id: WaypointId, optics: OpticsId): number {
  if (id === 'p6') return LAST_MIRROR_M[optics];
  return SMALL_MIRRORS.has(id) ? MIRROR_PROJECTION_M : MIRROR_ILLUMINATOR_M;
}

export const DROPLET_INSET_ANCHOR: Point = [-3, 4.3, 0];
export const PATTERN_INSET_ANCHOR: Point = [6, 1.2, 0];

export const ANCHOR_POINTS: Readonly<Record<AnchorId, Point>> = {
  flash: waypoint('plasma'),
  plasma: waypoint('plasma'),
  intermediateFocus: waypoint('focus'),
  mask: waypoint('mask'),
  wafer: waypoint('wafer'),
  dropletInset: DROPLET_INSET_ANCHOR,
  patternInset: PATTERN_INSET_ANCHOR,
};

export const PART_POINTS: Readonly<Record<PartId, Point>> = {
  flash: waypoint('plasma'),
  droplets: [-3, 1.9, 0],
  driveLaser: DRIVE_LASER_ROOM.centre,
  beamTransport: [-5.2, 1.2, 0],
  vessel: [-2.3, 2.1, 0],
  collector: [-2.4, 0.5, 0],
  plasma: waypoint('plasma'),
  intermediateFocus: waypoint('focus'),
  illuminator: waypoint('i2'),
  maskStage: MASK_STAGE.centre,
  mask: waypoint('mask'),
  pellicle: [3, 4.45, 0],
  projection: [3.6, 3.6, 0],
  waferStage: WAFER_STAGE.centre,
  wafer: waypoint('wafer'),
  dropletInset: DROPLET_INSET_ANCHOR,
  patternInset: PATTERN_INSET_ANCHOR,
  hair: [-3.6, 4, 0],
  virus: [7, 1.9, 0],
};

const MACHINE_DEPTH = 2.5;
const PART_DEPTH = 2;

export const REGION_SPECS: Readonly<Record<RegionId, RegionSpec>> = {
  machine: { x: [-7.9, 7.2], y: [-3.8, 5.6], z: [-MACHINE_DEPTH, MACHINE_DEPTH] },
  source: { x: [-7.2, 0], y: [-0.2, 5.4], z: [-PART_DEPTH, PART_DEPTH] },
  lightPath: { x: [-0.8, 4.6], y: [0.2, 5.6], z: [-PART_DEPTH, PART_DEPTH] },
  maskStage: { x: [2, 4], y: [3.8, 5.6], z: [-PART_DEPTH, PART_DEPTH] },
  waferStage: { x: [2.6, 7.2], y: [0, 2.6], z: [-PART_DEPTH, PART_DEPTH] },
  projection: { x: [2.6, 7.2], y: [0, 3.8], z: [-PART_DEPTH, PART_DEPTH] },
};
