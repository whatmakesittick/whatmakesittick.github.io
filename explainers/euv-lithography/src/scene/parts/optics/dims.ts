import { PROJECTION_BOX } from '../../../model/layout';
import type { Box } from '../../../model/scale';
import type { Point } from '../../../ids';

export interface Extent {
  readonly min: Point;
  readonly max: Point;
}

export function extentOf(box: Box): Extent {
  const min = box.centre.map((value, index) => value - box.size[index] / 2) as unknown as Point;
  const max = box.centre.map((value, index) => value + box.size[index] / 2) as unknown as Point;
  return { min, max };
}

export const BEAM_M = 0.05;
export const BEVEL_M = 0.012;
export const SEAM_M = 0.012;
export const PROUD_M = 0.006;
export const BOLT_M = 0.011;
export const SKIN_M = 0.03;
export const VENEER_M = 0.004;

export const ILLUMINATOR: Extent = { min: [0.1, 0.6, -0.6], max: [2.95, 3.6, 0.6] };
export const ILLUMINATOR_SLOT: Extent = { min: [2.7, 3.6, -0.15], max: [2.94, 3.6, 0.15] };
export const ILLUMINATOR_OUTLINE: readonly (readonly [number, number])[] = [
  [0.1, 0.6],
  [0.9, 0.6],
  [0.9, 2.55],
  [2.95, 2.55],
  [2.95, 3.6],
  [0.1, 3.6],
];
export const ILLUMINATOR_COLUMN_X = 0.9;
export const ILLUMINATOR_DUCT_Y = 2.55;
export const ILLUMINATOR_VIEWS: readonly Extent[] = [
  { min: [0.2, 0.8, 0.6], max: [0.8, 3.5, 0.6] },
  { min: [0.95, 2.65, 0.6], max: [2.8, 3.5, 0.6] },
];
export const ILLUMINATOR_LEGS = {
  columnXs: [0.22, 0.78],
  ductXs: [1.9, 2.85],
  zs: [-0.48, 0.48],
  tieY: 0.3,
} as const;
export const ILLUMINATOR_SEAMS = [
  { xs: [0.25, 0.75], ys: [1.6, 2.4], x: [0.1, 0.9], y: [0.6, 3.6] },
  { xs: [1.95], ys: [2.8], x: [0.9, 2.95], y: [2.55, 3.6] },
] as const;
export const ILLUMINATOR_HATCHES: readonly Point[] = [
  [0.5, 2.0, 0],
  [1.4, 3.05, 0],
  [2.5, 3.05, 0],
];
export const ILLUMINATOR_HATCH_M = 0.2;
export const ILLUMINATOR_PUMP: Point = [0.5, 1.15, 0];
export const ILLUMINATOR_TRAY = { x: [0.95, 2.9], y: 3.4 } as const;

export const ENTRY = {
  fromX: -0.3,
  toX: 0.1,
  y: 1.2,
  radius: 0.12,
  flangeOuter: 0.2,
  flangeThickness: 0.03,
  bellowsFrom: -0.2,
  bellowsTo: -0.02,
  ridges: 6,
  ridgeRise: 0.03,
  bolts: 8,
} as const;

export const PROJECTION: Extent = extentOf(PROJECTION_BOX);
export const PROJECTION_WALL_M = 0.05;
export const PROJECTION_SIDE_M = 0.06;
export const PROJECTION_WINDOW: Extent = { min: [3.0, 0.85, 0.8], max: [4.2, 3.45, 0.8] };
export const PROJECTION_TOP_OPENING: Extent = { min: [2.98, 3.6, -0.14], max: [3.24, 3.6, 0.14] };
export const PROJECTION_LEG_M = 0.1;
export const PROJECTION_LEG_INSET_M = 0.06;

export const BOTTOM_OPENING = { x: 3.9, z: 0, radius: 0.24 } as const;
export const IRIS = { baseDiameter: 0.4, inner: 0.16, outer: 0.26, thickness: 0.03 } as const;

export const COLUMN_XS: readonly number[] = [2.5, 3.5];
export const COLUMN_ZS: readonly number[] = [-0.55, 0.55];
export const COLUMN_TOP_Y = 4.7;
export const COLUMN_M = 0.06;
export const COLUMN_TIE_Y = 4.15;

export const PUMP_CENTRES: readonly Point[] = [
  [3.6, 2.55, 0],
  [3.6, 1.45, 0],
];
export const HATCH_CENTRES: readonly Point[] = [
  [3.07, 2.0, 0],
  [4.13, 2.0, 0],
  [3.07, 1.2, 0],
  [4.13, 1.2, 0],
];
export const HATCH_M = 0.24;
export const RIB_XS: readonly number[] = [3.28, 3.92];
export const RIB_YS: readonly number[] = [1.0, 3.05];
export const TRAY_Y = 3.35;
export const PIPE_XS: readonly number[] = [3.38, 3.82];
