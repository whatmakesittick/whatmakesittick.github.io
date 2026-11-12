import type { Point } from '../../../ids';
import { MASK, MASK_STAGE, WAFER_STAGE, waypoint } from '../../../model/layout';
import { mm } from '../../../model/scale';

export const MASK_AT = waypoint('mask');
export const WAFER_AT = waypoint('wafer');

export const MASK_ORIGIN: Point = [
  MASK_STAGE.centre[0],
  MASK_STAGE.centre[1] - MASK_STAGE.size[1] / 2,
  MASK_STAGE.centre[2],
];
export const WAFER_ORIGIN: Point = [
  WAFER_STAGE.centre[0],
  WAFER_STAGE.centre[1] - WAFER_STAGE.size[1] / 2,
  WAFER_STAGE.centre[2],
];

export const MASK_REL_Y = MASK_AT[1] - MASK_ORIGIN[1];
export const MASK_THICK = 0.012;
export const PATTERN_GAP = 0.0003;
export const PLATE_BOTTOM = MASK_REL_Y + PATTERN_GAP;
export const PLATE_TOP = PLATE_BOTTOM + MASK_THICK;
export const PELLICLE_REL_Y = 4.45 - MASK_ORIGIN[1];
export const PELLICLE = { z: 0.115, x: 0.145, bar: 0.008, tall: 0.006, post: 0.0025 } as const;
export const MASK_PATTERN_PX_PER_MM = 6;
export const MASK_PLATE_HALF = MASK.plateM / 2;

export const RAIL = {
  halfLength: 0.9,
  z: 0.4,
  width: 0.08,
  bottom: 0.06,
  top: 0.2,
  trackTop: 0.208,
  stripeTop: 0.212,
  stripeInset: 0.018,
} as const;

export const FRAME = {
  postX: 0.85,
  postZ: 0.45,
  post: 0.1,
  topBeam: 0.05,
  crossHeight: 0.14,
  backPanel: 0.03,
  boltPitch: 0.2,
  boltSize: 0.009,
} as const;

export const CARRIAGE = {
  halfX: 0.28,
  halfZ: 0.3,
  bodyBottom: 0.06,
  bodyTop: 0.18,
  shadeTop: 0.23,
  recessBottom: 0.02,
  recessHalf: 0.14,
  recessWall: 0.035,
  armBottom: 0.08,
  armTop: 0.16,
} as const;

export const CHUCK = { half: 0.075, tall: 0.026, post: 0.008, clamp: [0.02, 0.01, 0.03] } as const;

export const MASK_CHAIN = {
  z: 0.465,
  width: 0.04,
  thick: 0.04,
  topY: 0.255,
  bottomY: 0.14,
  attachX: -0.22,
  bendX: 0.55,
  mountX: 0.15,
  clearance: CARRIAGE.halfZ,
} as const;

export const WAFER_BASE = { half: 0.55, tall: 0.12, margin: 0.05 } as const;
export const SURFACE = { tall: 0.01, line: 0.004, pitch: 0.125 } as const;
export const WAFER_CARRIAGE = {
  halfX: 0.29,
  lowerBottom: 0.14,
  lowerTop: 0.21,
  midTop: 0.25,
  shadeTop: 0.262,
} as const;
export const WAFER_CHAIN = {
  z: 0.42,
  width: 0.04,
  thick: 0.03,
  topY: 0.235,
  bottomY: 0.165,
  attachX: -0.28,
  bendX: 0.35,
  mountX: -0.15,
  clearance: WAFER_CARRIAGE.halfX,
} as const;
export const CHUCK_DISC = { radius: 0.148, ring: 0.172, ringInner: 0.152 } as const;
export const WAFER_THICK = 0.004;
export const NOTCH_M = 0.0035;
export const WAFER_TEXTURE_PX = 1024;

export const SLIT_TALL = mm(1);
export const SLIT_BASE_X = mm(2);
export const SLIT_LIFT = 0.0012;
export const GLOW_SIZE = 0.16;
export const LIGHT_INTENSITY = 0.5;
export const LIGHT_RANGE = 1.6;
export const LIGHT_LIFT = 0.06;
export const STRIP_LIFT = 0.0004;
export const STRIP_OPACITY = 0.8;
