import { lerp, smoothstep } from '@core/math';
import { BODY } from '../../parts/car/dimensions';
import { smoothCurve, softRamp } from './curve';

export const BODY_X = {
  noseRound: 2.0,
  cowl: 1.55,
  cowlFrame: 1.5,
  doorFront: 0.94,
  headerFrame: 0.66,
  header: 0.62,
  roofRear: -0.4,
  rearHeaderFrame: -0.44,
  windowRear: -0.56,
  doorRear: -0.6,
  ventFront: -0.7,
  ventRear: -0.96,
  rearGlass: -1.3,
  deck: -1.35,
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
  [-1.0, 0.98],
  [-0.4, 0.962],
  [0.4, 0.958],
  [1.0, 0.98],
  [1.41, ARCH_PEAK_Z],
  [1.85, 0.965],
  [BODY.halfLength, 0.8],
]);

const SHOULDER_Y = smoothCurve([
  [-BODY.halfLength, 0.62],
  [-2.0, 0.52],
  [-1.41, 0.47],
  [0, 0.44],
  [1.41, 0.45],
  [BODY.halfLength, 0.37],
]);

const BELT_Y = smoothCurve([
  [-BODY.halfLength, 0.845],
  [-2.18, 0.82],
  [-1.8, 0.8],
  [-1.41, 0.79],
  [-0.9, 0.752],
  [-0.3, 0.718],
  [0.6, 0.692],
  [1.1, 0.682],
  [1.41, 0.69],
  [1.8, 0.665],
  [2.1, 0.62],
  [BODY.halfLength, 0.58],
]);

const BELT_Z = smoothCurve([
  [-BODY.halfLength, 0.8],
  [-1.8, 0.83],
  [-1.0, 0.845],
  [0, 0.835],
  [1.0, 0.83],
  [1.41, 0.81],
  [1.9, 0.78],
  [BODY.halfLength, 0.7],
]);

const TOP_Y = smoothCurve([
  [-BODY.halfLength, 0.865],
  [-2.2, 0.855],
  [-1.95, 0.83],
  [-1.6, 0.815],
  [-1.35, 0.825],
  [-1.05, 0.872],
  [-0.75, 0.932],
  [-0.45, 0.99],
  [-0.1, 1.022],
  [0.2, BODY.roofY],
  [0.45, 1.02],
  [0.7, 0.993],
  [0.95, 0.92],
  [1.25, 0.8],
  [1.5, 0.7],
  [1.6, 0.668],
  [1.8, 0.628],
  [2.05, 0.59],
  [BODY.halfLength, 0.555],
]);

const RAIL_Z = smoothCurve([
  [-1.35, 0.8],
  [-0.9, 0.74],
  [-0.45, 0.69],
  [0.62, 0.685],
  [0.95, 0.72],
  [1.25, 0.77],
  [1.55, 0.82],
]);

const SCOOP = { depth: 0.03, rise: [-1.0, -0.82], fade: [-0.6, 0.8] } as const;

const ROOF_DROP = 0.055;
const GREENHOUSE_KNEE = 0.02;
const GREENHOUSE_FULL = 0.12;

const NOSE: EndScale & { start: number } = {
  start: BODY_X.noseRound,
  z: 0.7,
  y: 0.62,
  pivotY: 0.13,
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
