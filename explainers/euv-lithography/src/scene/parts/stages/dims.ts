import type { Point } from '../../../ids';
import { MASK, waypoint } from '../../../model/layout';
import { mm } from '../../../model/scale';
import type { Extent } from '../optics/dims';

export const MASK_AT = waypoint('mask');
export const WAFER_AT = waypoint('wafer');

export const MASK_MODULE_PORT: Extent = { min: [1.74, 4.35, -0.25], max: [2.1, 4.85, 0.25] };
export const MASK_MODULE_PORT_DOOR = { u: [-0.19, 0.19], v: [4.45, 4.75] } as const;
export const MASK_MODULE_LID: Extent = { min: [2.25, 5.45, -0.55], max: [3.75, 5.5, 0.55] };
export const MASK_MODULE_DOOR = { u: [-0.35, 0.35], v: [3.85, 5.1] } as const;
export const MASK_MODULE_VENT = { u: [2.35, 2.95], v: [3.8, 4.3] } as const;

export const MASK_BRIDGE: Extent = { min: [2.2, 4.94, -0.4], max: [3.8, 5.08, 0.4] };
export const MASK_WALL_X: readonly [number, number] = [2.14, 3.86];
export const MASK_RAILS = { z: 0.27, half: 0.015, bottom: 4.9, x: [2.25, 3.75] } as const;
export const MASK_TRACK = { halfZ: 0.18, bottom: 4.905, x: [2.3, 3.7] } as const;
export const MASK_CARRIAGE = { halfX: 0.24, halfZ: 0.33, bottom: 4.66, top: 4.9 } as const;
export const MASK_BLOCK = { halfX: 0.07, offset: 0.13, bottom: 4.875, halfZ: 0.032 } as const;

export const MASK_THICK = 0.012;
export const PATTERN_GAP = 0.0005;
export const PLATE_BOTTOM = MASK_AT[1] + PATTERN_GAP;
export const PLATE_TOP = PLATE_BOTTOM + MASK_THICK;
export const PLATE_HALF = MASK.plateM / 2;
export const PELLICLE = {
  standoff: 0.025,
  x: 0.145,
  z: 0.115,
  bar: 0.008,
  tall: 0.008,
  post: 0.0025,
} as const;
export const PELLICLE_Y = MASK_AT[1] - PELLICLE.standoff;
export const MASK_PATTERN_PX_PER_MM = 6;
export const CHUCK = { half: 0.07, clampLong: 0.03, clampTall: 0.024, clampThick: 0.008 } as const;

export const BAND_THICK = 0.0012;
export const BAND_GLOW_SIZE = 0.3;

export const MASK_CHAIN = {
  z: -0.5,
  width: 0.06,
  thick: 0.03,
  topY: 4.8,
  bottomY: 4.7,
  attachX: MASK_AT[0] - 0.22,
  bendX: MASK_AT[0] + 0.55,
  mountX: MASK_AT[0] + 0.15,
  clearance: MASK_CARRIAGE.halfZ,
} as const;
export const MASK_CHAIN_SHELF: Extent = { min: [3.1, 4.67, -0.66], max: [3.6, 4.685, -0.47] };

export const WAFER_GRANITE: Extent = { min: [3.35, 0.16, -0.45], max: [4.45, 0.2, 0.45] };
export const WAFER_RAILS = {
  z: 0.36,
  half: 0.0125,
  bottom: 0.2,
  top: 0.218,
  x: [3.4, 4.4],
} as const;
export const WAFER_TRACK = { halfZ: 0.12, top: 0.208, x: [3.45, 4.35] } as const;
export const WAFER_CARRIAGE = {
  halfX: 0.25,
  halfZ: 0.34,
  bottom: 0.225,
  top: 0.265,
  coverTop: 0.272,
  coverHalf: 0.2,
} as const;
export const WAFER_BLOCK = {
  halfX: 0.07,
  offset: 0.15,
  bottom: 0.205,
  top: 0.235,
  halfZ: 0.03,
} as const;
export const WAFER_CHAIN = {
  z: -0.58,
  width: 0.05,
  thick: 0.03,
  topY: 0.24,
  bottomY: 0.175,
  attachX: WAFER_AT[0] - 0.2,
  bendX: WAFER_AT[0] + 0.4,
  mountX: WAFER_AT[0] + 0.05,
  clearance: WAFER_CARRIAGE.halfZ,
} as const;
export const CHUCK_DISC = { radius: 0.148, ring: 0.172, ringInner: 0.152 } as const;
export const WAFER_THICK = 0.004;
export const NOTCH_M = 0.0035;
export const WAFER_TEXTURE_PX = 1024;

export const SLIT_TALL = mm(3);
export const SLIT_BASE_X = mm(2);
export const SLIT_LIFT = 0.0012;
export const GLOW_SIZE = 0.2;
export const LIGHT_INTENSITY = 0.5;
export const LIGHT_RANGE = 1.6;
export const LIGHT_LIFT = 0.06;
export const STRIP_LIFT = 0.0004;
export const STRIP_OPACITY = 0.8;

export const MASK_LABEL: Point = [MASK_AT[0], 4.92, MASK_CARRIAGE.halfZ];
export const WAFER_LABEL: Point = [WAFER_AT[0], 0.25, WAFER_CARRIAGE.halfZ];
