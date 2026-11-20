import type { RegionSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';

export const POOL_LENGTH_M = 50;
export const LANE_WIDTH_M = 2.5;
export const WATER_DEPTH_M = 2.5;
export const FLOAT_M = 0.15;
export const SCROLL_PERIOD_M = 0.3;
export const SLICE_HALF_LENGTH_M = 4;
export const LANE_LINE_WIDTH_M = 0.2;
export const ROPE_Z_M = LANE_WIDTH_M / 2;

export const REGION_SPECS: Readonly<Record<RegionId, RegionSpec>> = {
  body: { x: [-1.8, 1.0], y: [-0.6, 0.4], z: [-0.7, 0.7] },
  rightArm: { x: [-0.4, 1.0], y: [-0.9, 0.5], z: [-0.3, 0.9] },
  shoulders: { x: [-0.3, 0.5], y: [-0.5, 0.4], z: [-0.7, 0.7] },
  legs: { x: [-1.9, -0.5], y: [-0.8, 0.3], z: [-0.4, 0.4] },
  forebody: { x: [-0.9, 1.0], y: [-0.6, 0.5], z: [-0.6, 0.6] },
};
