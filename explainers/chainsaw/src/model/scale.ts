import { toRadians } from '@core/math';
import type { Point } from '../ids';

export interface Bounds {
  min: Point;
  max: Point;
}

export const CRANK_Y = 0.1;
export const BAR_PLANE_Z = 0.088;
export const BAR_THICKNESS = 0.005;

export const ENGINE_GEOMETRY = {
  bore: 0.05,
  throw: 0.02,
  rod: 0.072,
  pinToCrown: 0.018,
  pistonLength: 0.045,
  headTop: 0.235,
  plugTip: 0.215,
  plugTop: 0.262,
  crankcase: { min: [-0.05, 0.05, -0.04], max: [0.05, 0.15, 0.04] },
} as const;

export const SAW_GEOMETRY = {
  powerhead: { min: [-0.12, 0, -0.09], max: [0.08, 0.27, 0.08] },
  rearGrip: [-0.24, 0.16, 0],
  rearHandle: { min: [-0.35, 0.14, -0.02], max: [-0.12, 0.18, 0.02] },
  trigger: [-0.17, 0.13, 0],
  frontHandle: { min: [0.02, 0.1, -0.1], max: [0.06, 0.3, 0.06] },
  handGuardPivot: [0.075, 0.2, 0],
  handGuardTop: 0.31,
  guardTripDeg: 15,
  muffler: { min: [0.05, 0.14, -0.02], max: [0.11, 0.22, 0.05] },
  carburettor: { min: [-0.11, 0.13, -0.025], max: [-0.06, 0.18, 0.025] },
  airFilter: { min: [-0.11, 0.19, -0.04], max: [-0.03, 0.24, 0.04] },
  fuelTank: { min: [-0.26, 0, -0.07], max: [-0.1, 0.08, 0.07] },
  oilTank: { min: [0.02, 0, -0.068], max: [0.1, 0.06, 0.08] },
  starter: { min: [-0.08, 0.04, -0.1], max: [0.06, 0.18, -0.07] },
  clutchShoesZ: 0.065,
  drumRadius: 0.035,
  drumZ: [0.058, 0.08],
  clutchCover: { min: [-0.03, 0.04, 0.08], max: [0.12, 0.16, 0.11] },
  chainCatcher: [0.07, 0.065, BAR_PLANE_Z],
  zoneRadius: 0.038,
  starterFaceZ: -0.068,
  fuelCap: { centre: [-0.212, 0.042, -0.068], radius: 0.02, height: 0.012 },
  oilCap: { centre: [0.059, 0.032, -0.068], radius: 0.0165, height: 0.012 },
  primerBulb: { centre: [-0.09, 0.2, -0.078], radius: 0.011 },
  chokeLever: { pivot: [-0.104, 0.25, -0.05], length: 0.022, onDeg: 40 },
  decompressionValve: { centre: [0.015, 0.27, -0.035], radius: 0.006, travel: 0.004 },
} as const;

export const STARTER_GEOMETRY = {
  flywheel: { centre: [0, CRANK_Y, -0.078], radius: 0.034, thickness: 0.008 },
  pawls: { z: -0.084, radius: 0.012 },
  pulley: { centre: [0, CRANK_Y, -0.09], radius: 0.02, thickness: 0.008 },
  ropeEye: [-0.02, 0.18, -0.09],
  gripRest: [0, 0.192, -0.088],
  gripLength: 0.064,
  ropeDirection: [0, 0.9701425, -0.2425356],
  ropeDrawM: 0.45,
  coilAngleDeg: 55,
  coilDrawnGap: 0.004,
} as const;

export const KICKBACK_ENVELOPE_DEG = 35;

export const SAW_REACH: Bounds = { min: [-0.35, 0, -0.1], max: [0.49, 0.31, 0.11] };

function boundsOf(points: readonly Point[]): Bounds {
  const axis = (index: 0 | 1 | 2, pick: (...values: number[]) => number) =>
    pick(...points.map((point) => point[index]));
  return {
    min: [axis(0, Math.min), axis(1, Math.min), axis(2, Math.min)],
    max: [axis(0, Math.max), axis(1, Math.max), axis(2, Math.max)],
  };
}

function corners({ min, max }: Bounds): Point[] {
  const xs = [min[0], max[0]];
  const ys = [min[1], max[1]];
  const zs = [min[2], max[2]];
  return xs.flatMap((x) => ys.flatMap((y) => zs.map((z): Point => [x, y, z])));
}

export function rotateAboutZ(point: Point, pivot: Point, degrees: number): Point {
  const angle = toRadians(degrees);
  const dx = point[0] - pivot[0];
  const dy = point[1] - pivot[1];
  return [
    pivot[0] + dx * Math.cos(angle) - dy * Math.sin(angle),
    pivot[1] + dx * Math.sin(angle) + dy * Math.cos(angle),
    point[2],
  ];
}

const ENVELOPE_STEPS = 7;

export function sweptBounds(bounds: Bounds, pivot: Point, degrees: number): Bounds {
  const angles = Array.from(
    { length: ENVELOPE_STEPS + 1 },
    (_, step) => (degrees * step) / ENVELOPE_STEPS,
  );
  return boundsOf(
    angles.flatMap((angle) => corners(bounds).map((point) => rotateAboutZ(point, pivot, angle))),
  );
}

export function unionBounds(...all: readonly Bounds[]): Bounds {
  return boundsOf(all.flatMap((bounds) => [bounds.min, bounds.max]));
}
