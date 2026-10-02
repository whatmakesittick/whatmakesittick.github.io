import { FULL_TURN, toRadians } from '@core/math';
import type { Point } from '../ids';
import { metresToUnits } from './scale';

export type Extent = readonly [min: number, max: number];

export interface Box {
  x: Extent;
  y: Extent;
  z: Extent;
}

export const RUNWAY = {
  x: [-125, 0] as Extent,
  z: 0,
  halfWidth: 3,
  heading: 0,
} as const;

export const THRESHOLD: Point = [RUNWAY.x[0], 0, RUNWAY.z];
export const LIFTOFF_X = -45;
export const TOUCHDOWN_X = -20;
export const ROLLOUT_END_X = -115;
export const LIFTOFF_DISTANCE = LIFTOFF_X - RUNWAY.x[0];
export const TAKEOFF_PHASE_DISTANCE = 150;
export const CLIMB_PHASE_DISTANCE = 700;
export const ROLLOUT_DISTANCE = TOUCHDOWN_X - ROLLOUT_END_X;

export const GROUND_STATION: Point = [-70, 0, 28];
export const LOS_MAST = { position: [-60, 0, 24] as Point, height: 3 } as const;

export const CRUISE_ALTITUDE_M = 7600;
export const CRUISE_ALTITUDE = metresToUnits(CRUISE_ALTITUDE_M);
export const CLIMB_END_DISTANCE = 900;
export const DESCENT_LENGTH = 400;

export const LOITER = {
  entry: [1000, 0] as const,
  centre: [1000, 150] as const,
  radius: 150,
  laps: 2.5,
  lapsBeforeStrike: 1.375,
  lapsDuringStrike: 1,
} as const;

export const LOITER_CIRCUMFERENCE = FULL_TURN * LOITER.radius;
export const TARGET: Point = [LOITER.centre[0], 0, LOITER.centre[1]];
export const SATELLITE_POSITION: Point = [1400, 1100, -1600];

export const RETURN_LEG = { z: 300, length: 600, endX: 400 } as const;
export const S_TURN_RADIUS = 150;
export const FINAL_START_X = 100;
export const FINAL_LENGTH = FINAL_START_X - ROLLOUT_END_X;

export const BANK_MAX = toRadians(25);
export const BANK_BLEND_DISTANCE = 20;
export const PITCH_SHARE = 0.4;

export const AIRSPEED_KMH = {
  liftoff: 150,
  climb: 260,
  cruise: 370,
  loiter: 300,
  touchdown: 150,
} as const;

export const AIRCRAFT = {
  span: 20.1,
  length: 11,
  height: 3.8,
  rootChord: 1.65,
  tipChord: 0.73,
  propellerBlades: 3,
  sensorBallDiameter: 0.56,
  hardpoints: 7,
  restHeight: 1.9,
} as const;

export const AIRCRAFT_LAYOUT = {
  nose: [6, 0, 0] as Point,
  hump: [4.2, 0.8, 0] as Point,
  sensorBall: [4.6, -0.95, 0] as Point,
  wingQuarterChord: [0.5, 0.2, 0] as Point,
  tailTop: [-4.5, 1.9, 0] as Point,
  propeller: [-5, 0, 0] as Point,
  noseGear: [4, -1.9, 0] as Point,
  mainGear: [-0.5, -1.9, 1.2] as Point,
  pylonX: 0.3,
  pylonY: -0.45,
  pylonZ: { inboard: 2.6, middle: 4.4, outboard: 6.2 },
} as const;

export const HELLFIRE = { length: 1.62, diameter: 0.178, finSpan: 0.71, count: 4 } as const;
export const BOMBS = { length: 3.28, diameter: 0.27, count: 2 } as const;

export const SCENE_BOUNDS: Box = { x: [-400, 1400], y: [0, 520], z: [-400, 700] };
export const AIRFIELD_BOUNDS: Box = { x: [-160, 40], y: [0, 20], z: [-60, 60] };
export const TARGET_BOUNDS: Box = { x: [980, 1020], y: [0, 10], z: [130, 170] };
