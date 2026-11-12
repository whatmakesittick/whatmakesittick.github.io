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

export const BEVEL_M = 0.012;
export const SEAM_M = 0.012;
export const BOLT_M = 0.011;
export const SKIN_M = 0.03;
export const ILLUMINATOR_SLOT: Extent = { min: [2.7, 3.6, -0.15], max: [2.9, 3.6, 0.15] };
export const ILLUMINATOR_COLUMN_X = 0.9;
export const ILLUMINATOR_DUCT_Y = 2.55;
export const ILLUMINATOR_PUMP: Point = [0.5, 1.9, 0];

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

export const PROJECTION_TOP_OPENING: Extent = { min: [2.98, 3.6, -0.14], max: [3.24, 3.6, 0.14] };
export const BOTTOM_OPENING = { x: 3.9, z: 0, radius: 0.24 } as const;
export const IRIS = { baseDiameter: 0.4, inner: 0.16, outer: 0.26, thickness: 0.03 } as const;

export const PUMP_CENTRES: readonly Point[] = [
  [3.6, 2.55, 0],
  [3.6, 1.45, 0],
];
export const PIPE_XS: readonly number[] = [3.38, 3.82];
export const TRAY_Y = 3.35;
