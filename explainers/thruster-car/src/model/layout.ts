import { smoothstep } from '@core/math';
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
  run: { x: [-10, 100], z: [-6, 6] },
  startBox: { x: [-2, 2], z: [-1.5, 1.5] },
  landingBox: { x: [56, 70], z: [-3, 3] },
  groundSize: 600,
  fogNear: 120,
  coneLineZ: 5,
} as const satisfies {
  run: Footprint;
  startBox: Footprint;
  landingBox: Footprint;
  groundSize: number;
  fogNear: number;
  coneLineZ: number;
};

export const RAMP = {
  entryX: 24,
  lengthX: 12,
  exitHeight: 4,
  exitAngleDeg: 42,
  width: 3,
} as const;

export const RAMP_EXIT_X = RAMP.entryX + RAMP.lengthX;

const RAMP_SQUARE_M = 1.2;
const RAMP_CUBE_M = 2.8;

export function rampHeight(u: number): number {
  return RAMP_SQUARE_M * u ** 2 + RAMP_CUBE_M * u ** 3;
}

export function rampSlope(u: number): number {
  return (2 * RAMP_SQUARE_M * u + 3 * RAMP_CUBE_M * u ** 2) / RAMP.lengthX;
}

export function rampPitch(u: number): number {
  return Math.atan(rampSlope(u));
}

export function rampRoll(u: number): number {
  return Math.PI * smoothstep(u);
}

export function rampPoint(u: number): Point {
  return [RAMP.entryX + RAMP.lengthX * u, rampHeight(u), 0];
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
  rampExit: rampPoint(1),
  pad: [(SITE.landingBox.x[0] + SITE.landingBox.x[1]) / 2, 0, 0],
};

export const CAR_REGIONS: Readonly<Record<CarRegionId, RegionSpec>> = {
  car: { x: [-2.3, 2.3], y: [0, 1.05], z: [-1, 1] },
  cabin: { x: [-0.8, 1.1], y: [0.2, 1.05], z: [-0.95, 0.95] },
  tail: { x: [-2.6, -1.2], y: [0.1, 0.9], z: [-1, 1] },
};

export const SITE_REGIONS: Readonly<Record<SiteRegionId, RegionSpec>> = {
  site: { x: SITE.run.x, y: [0, 10], z: SITE.run.z },
  ramp: { x: [RAMP.entryX, RAMP_EXIT_X], y: [0, RAMP.exitHeight + 1], z: [-2, 2] },
  arc: { x: [20, 70], y: [0, 10], z: [-3, 3] },
};
