import { clamp } from '@core/math';
import type { Extent, RegionSpec } from '@core/scene/regions';
import type { CarAnchorId, CarRegionId, NozzleId, Point, SiteAnchorId, SiteRegionId } from '../ids';

export interface Footprint {
  x: Extent;
  z: Extent;
}

export interface NozzleMount {
  at: Point;
  dir: Point;
}

export const SITE = {
  run: { x: [-90, 75], z: [-6, 6] },
  startBox: { x: [-2, 2], z: [-1.5, 1.5] },
  finishLineX: 10.9,
  landingBox: { x: [25, 39], z: [-3, 3] },
  jumpLandingBox: { x: [-60, -46], z: [-3, 3] },
  groundSize: 600,
  fogNear: 120,
  coneLineZ: 5,
} as const satisfies {
  run: Footprint;
  startBox: Footprint;
  finishLineX: number;
  landingBox: Footprint;
  jumpLandingBox: Footprint;
  groundSize: number;
  fogNear: number;
  coneLineZ: number;
};

const RAMP_RADIUS = 5;

export const RAMP = {
  entryX: 60,
  radius: RAMP_RADIUS,
  deckLength: 8,
  width: 3,
  exitHeight: 2 * RAMP_RADIUS,
  exitAngleDeg: 0,
} as const;

export const LOOP_LENGTH = Math.PI * RAMP.radius;
export const RAMP_LENGTH = LOOP_LENGTH + RAMP.deckLength;
export const DECK_END_X = RAMP.entryX - RAMP.deckLength;

function alongRamp(distance: number): number {
  return clamp(distance, 0, RAMP_LENGTH);
}

export function rampPitch(distance: number): number {
  return Math.min(alongRamp(distance), LOOP_LENGTH) / RAMP.radius;
}

export function rampPoint(distance: number): Point {
  const along = alongRamp(distance);
  if (along >= LOOP_LENGTH) return [RAMP.entryX - (along - LOOP_LENGTH), RAMP.exitHeight, 0];
  const angle = along / RAMP.radius;
  return [RAMP.entryX + RAMP.radius * Math.sin(angle), RAMP.radius * (1 - Math.cos(angle)), 0];
}

export const JUMP = { leapX: -3 } as const;

export type ParkedKind = 'car' | 'truck';

export interface ParkedVehicle {
  kind: ParkedKind;
  centreX: number;
  length: number;
  width: number;
  height: number;
}

const PARKED_CAR = { kind: 'car', length: 4.7, width: 1.9, height: 1.5 } as const;
const PARKED_TRUCK = { kind: 'truck', length: 8, width: 2.6, height: 4 } as const;

export const PARKED_ROW: readonly ParkedVehicle[] = [
  { ...PARKED_CAR, centreX: -15 },
  { ...PARKED_CAR, centreX: -20 },
  { ...PARKED_TRUCK, centreX: -31 },
  { ...PARKED_CAR, centreX: -39 },
];

const ROW_START_X = Math.max(...PARKED_ROW.map((car) => car.centreX + car.length / 2));
const ROW_END_X = Math.min(...PARKED_ROW.map((car) => car.centreX - car.length / 2));
export const ROW_TOP = Math.max(...PARKED_ROW.map((car) => car.height));

function middle([from, to]: Extent): number {
  return (from + to) / 2;
}

export const CAR = {
  wheelbase: 2.825,
  width: 2.0,
  length: 4.6,
  height: 1.15,
  rideHeight: 0.12,
  wheelRadius: 0.34,
  mass: 1700,
} as const;

export const DRIVER_Z = -0.45;
export const TANK_Z = 0.45;

const DOWN: Point = [0, -1, 0];
const LEFT: Point = [0, 0, -1];
const RIGHT: Point = [0, 0, 1];
const BACK: Point = [-1, 0, 0];

export const NOZZLES: Readonly<Record<NozzleId, NozzleMount>> = {
  cornerFrontLeft: { at: [1.6, 0.35, -0.9], dir: DOWN },
  cornerFrontRight: { at: [1.6, 0.35, 0.9], dir: DOWN },
  cornerRearLeft: { at: [-1.6, 0.35, -0.9], dir: DOWN },
  cornerRearRight: { at: [-1.6, 0.35, 0.9], dir: DOWN },
  frontLeft: { at: [2.2, 0.5, -0.5], dir: LEFT },
  frontRight: { at: [2.2, 0.5, 0.5], dir: RIGHT },
  rearOuterLeft: { at: [-2.25, 0.5, -0.65], dir: BACK },
  rearInnerLeft: { at: [-2.25, 0.5, -0.3], dir: BACK },
  rearInnerRight: { at: [-2.25, 0.5, 0.3], dir: BACK },
  rearOuterRight: { at: [-2.25, 0.5, 0.65], dir: BACK },
};

export const ROLL_ARM_M = 0.9;

export const TANK = { radius: 0.3, length: 1.6, centre: [0.2, 0.55, TANK_Z] as Point } as const;

export const TANK_VALVE: Point = [TANK.centre[0] - TANK.length / 2, TANK.centre[1], TANK_Z];

export const SEAT: Point = [0.2, 0.5, DRIVER_Z];

export const CAR_ANCHORS: Readonly<Record<CarAnchorId, Point>> = {
  car: [0, CAR.height / 2, 0],
  tank: TANK.centre,
  tail: [-CAR.length / 2, 0.5, 0],
};

export const SITE_ANCHORS: Readonly<Record<SiteAnchorId, Point>> = {
  rampExit: rampPoint(RAMP_LENGTH),
  pad: [middle(SITE.landingBox.x), 0, 0],
  row: [(ROW_START_X + ROW_END_X) / 2, ROW_TOP, 0],
};

export const CAR_REGIONS: Readonly<Record<CarRegionId, RegionSpec>> = {
  car: { x: [-2.3, 2.3], y: [0, 1.05], z: [-1, 1] },
  cabin: { x: [-0.8, 1.1], y: [0.2, 1.05], z: [-0.95, 0.95] },
  tail: { x: [-2.6, -1.2], y: [0.1, 0.9], z: [-1, 1] },
};

export const SITE_REGIONS: Readonly<Record<SiteRegionId, RegionSpec>> = {
  site: { x: SITE.run.x, y: [0, 13], z: SITE.run.z },
  ramp: { x: [DECK_END_X, RAMP.entryX + RAMP.radius], y: [0, RAMP.exitHeight + 1], z: [-2, 2] },
  arc: { x: [20, 70], y: [0, 13], z: [-3, 3] },
  jump: { x: [-64, 5], y: [0, 12], z: [-4, 4] },
};
