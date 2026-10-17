import { lerp, smoothstep } from '@core/math';
import { BODY } from '../../parts/car/dimensions';
import { smoothCurve, softRamp } from './curve';

export const BODY_X = {
  noseRound: 2.1,
  cowl: 1.42,
  cowlFrame: 1.38,
  doorFront: 0.94,
  headerFrame: 0.52,
  header: 0.48,
  roofRear: -0.3,
  rearHeaderFrame: -0.34,
  windowRear: -0.56,
  doorRear: -0.6,
  ventFront: -0.7,
  ventRear: -0.96,
  rearGlass: -1.18,
  deck: -1.23,
  tailPanel: -2.04,
  tailRound: -2.14,
} as const;

export interface StationProfile {
  scoop: number;
  floorY: number;
  sillY: number;
  rockerZ: number;
  sideZ: number;
  shoulderY: number;
  beltZ: number;
  beltY: number;
  railZ: number;
  railY: number;
  topY: number;
  greenhouse: number;
}

export interface EndScale {
  z: number;
  y: number;
  pivotY: number;
}

const FLOOR_Y = smoothCurve([
  [-BODY.halfLength, 0.2],
  [-2.05, 0.11],
  [-1.82, 0.03],
  [-1.62, 0],
  [1.7, 0],
  [2.0, 0.05],
  [BODY.halfLength, 0.1],
]);

const SILL_HEIGHT = smoothCurve([
  [-BODY.halfLength, 0.42],
  [-2.0, 0.24],
  [-1.6, 0.16],
  [1.9, 0.16],
  [BODY.halfLength, 0.17],
]);

const ROCKER_TUCK = 0.12;

export const FLARE = { depth: 0.012, band: 0.09, fadeBelow: 0.05, fullAbove: 0.1 } as const;

const ARCH_PEAK_Z = BODY.halfWidth - FLARE.depth;

const SIDE_Z = smoothCurve([
  [-BODY.halfLength, 0.92],
  [-1.9, 0.975],
  [-1.41, ARCH_PEAK_Z],
  [-1.0, 0.97],
  [-0.4, 0.94],
  [0.4, 0.935],
  [1.0, 0.965],
  [1.41, 0.978],
  [1.85, 0.962],
  [BODY.halfLength, 0.8],
]);

const SHOULDER_Y = smoothCurve([
  [-BODY.halfLength, 0.6],
  [-2.0, 0.55],
  [-1.5, 0.52],
  [-0.8, 0.46],
  [0, 0.44],
  [1.41, 0.44],
  [BODY.halfLength, 0.37],
]);

const BELT_Y = smoothCurve([
  [-BODY.halfLength, 0.79],
  [-2.1, 0.79],
  [-1.8, 0.835],
  [-1.5, 0.855],
  [-1.2, 0.83],
  [-0.9, 0.775],
  [-0.5, 0.7],
  [0, 0.675],
  [0.6, 0.665],
  [1.1, 0.665],
  [1.41, 0.67],
  [1.8, 0.63],
  [2.1, 0.575],
  [BODY.halfLength, 0.53],
]);

const BELT_Z = smoothCurve([
  [-BODY.halfLength, 0.76],
  [-1.8, 0.79],
  [-1.41, 0.78],
  [-0.6, 0.78],
  [0.5, 0.775],
  [1.1, 0.765],
  [1.41, 0.76],
  [1.9, 0.75],
  [BODY.halfLength, 0.69],
]);

const TOP_Y = smoothCurve([
  [-BODY.halfLength, 0.79],
  [-2.22, 0.772],
  [-2.0, 0.778],
  [-1.7, 0.8],
  [-1.4, 0.83],
  [-1.1, 0.872],
  [-0.8, 0.93],
  [-0.5, 0.98],
  [-0.2, 1.018],
  [0.15, BODY.roofY],
  [0.45, 1.015],
  [0.7, 0.965],
  [0.95, 0.88],
  [1.2, 0.76],
  [1.42, 0.66],
  [1.55, 0.625],
  [1.8, 0.58],
  [2.1, 0.53],
  [BODY.halfLength, 0.5],
]);

const RAIL_Z = smoothCurve([
  [-1.25, 0.6],
  [-0.9, 0.6],
  [-0.4, 0.62],
  [0.5, 0.62],
  [0.9, 0.66],
  [1.2, 0.71],
  [1.42, 0.75],
]);

const SCOOP = { depth: 0.03, rise: [-1.0, -0.82], fade: [-0.6, 0.8] } as const;

const ROOF_DROP = 0.055;
const GREENHOUSE_KNEE = 0.02;
const GREENHOUSE_FULL = 0.12;

const NOSE: EndScale & { start: number } = {
  start: BODY_X.noseRound,
  z: 0.76,
  y: 0.76,
  pivotY: 0.15,
};
const TAIL: EndScale & { start: number } = {
  start: BODY_X.tailRound,
  z: 0.86,
  y: 0.74,
  pivotY: 0.82,
};

function scoopDepth(x: number): number {
  const rise = smoothstep(x, SCOOP.rise[0], SCOOP.rise[1]);
  return SCOOP.depth * rise * (1 - smoothstep(x, SCOOP.fade[0], SCOOP.fade[1]));
}

export function stationProfile(x: number): StationProfile {
  const floorY = FLOOR_Y(x);
  const sideZ = SIDE_Z(x);
  const beltZ = BELT_Z(x);
  const beltY = BELT_Y(x);
  const topY = TOP_Y(x);
  const height = softRamp(topY - ROOF_DROP - beltY, GREENHOUSE_KNEE);
  const greenhouse = smoothstep(height, 0, GREENHOUSE_FULL);
  return {
    scoop: scoopDepth(x),
    floorY,
    sillY: floorY + SILL_HEIGHT(x),
    rockerZ: sideZ - ROCKER_TUCK,
    sideZ,
    shoulderY: SHOULDER_Y(x),
    beltZ,
    beltY,
    railZ: lerp(beltZ, RAIL_Z(x), greenhouse),
    railY: beltY + height,
    topY,
    greenhouse,
  };
}

export function endScale(x: number): EndScale {
  const end = x > 0 ? NOSE : TAIL;
  const reach = BODY.halfLength - Math.abs(end.start);
  const into = (Math.abs(x) - Math.abs(end.start)) / reach;
  if (into <= 0) return { z: 1, y: 1, pivotY: end.pivotY };
  const arc = Math.sqrt(Math.max(0, 1 - into * into));
  return { z: lerp(end.z, 1, arc), y: lerp(end.y, 1, arc), pivotY: end.pivotY };
}

export function roundingStart(sign: number): number {
  return sign > 0 ? NOSE.start : TAIL.start;
}
