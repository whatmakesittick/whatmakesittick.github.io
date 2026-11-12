import { PROJECTION_BOX } from '../../model/layout';
import type { Extent } from './optics/dims';
import { extentOf } from './optics/dims';

export const FOOT_TOP_Y = 0.1;
export const DECK_TOP_Y = 0.7;
export const MODULE_TOP_Y = 3.6;

export const BASE: Extent = { min: [0, FOOT_TOP_Y, -0.85], max: [4.7, DECK_TOP_Y, 0.85] };
export const WAFER_BAY: Extent = { min: [3.2, FOOT_TOP_Y, -0.7], max: [4.6, DECK_TOP_Y, 0.85] };
export const WAFER_BAY_WINDOW = { u: [3.3, 4.5], v: [0.17, 0.64] } as const;

export const ILLUMINATOR_BODY: Extent = {
  min: [0.1, DECK_TOP_Y, -0.7],
  max: [2.9, MODULE_TOP_Y, 0.7],
};
export const ILLUMINATOR_BAY = { u: [0.9, 2.9], v: [DECK_TOP_Y, 2.55] } as const;

export const PROJECTION_BODY: Extent = extentOf(PROJECTION_BOX);

export const MASK_MODULE: Extent = { min: [2.1, MODULE_TOP_Y, -0.7], max: [3.9, 5.45, 0.7] };
export const MASK_MODULE_WINDOW = { u: [2.3, 3.7], v: [3.75, 5.25] } as const;

export const POST_M = 0.09;
