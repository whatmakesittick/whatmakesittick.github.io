import type { Box3, Matrix4 } from 'three';
import { localRegions } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { waypoint } from '../model/layout';

const [MASK_X, MASK_Y] = waypoint('mask');
const [WAFER_X] = waypoint('wafer');

const MASK_VIEW = { halfWidth: 0.11, below: 0.3, above: 0.2, depth: 0.2 } as const;
const WAFER_VIEW = { left: 0.6, right: 2.8, bottom: -0.5, top: 2.4, depth: 1.2 } as const;
const LIGHT_PATH_VIEW = { x: [-0.8, 4.6], y: [-1.2, 5.8], depth: 2 } as const;
const OPTICS_VIEW = { x: [2.6, 7.2], y: [-0.5, 3.8], depth: 2 } as const;

export const VIEW_REGION_SPECS: Readonly<Partial<Record<RegionId, RegionSpec>>> = {
  maskStage: {
    x: [MASK_X - MASK_VIEW.halfWidth, MASK_X + MASK_VIEW.halfWidth],
    y: [MASK_Y - MASK_VIEW.below, MASK_Y + MASK_VIEW.above],
    z: [-MASK_VIEW.depth, MASK_VIEW.depth],
  },
  waferStage: {
    x: [WAFER_X - WAFER_VIEW.left, WAFER_X + WAFER_VIEW.right],
    y: [WAFER_VIEW.bottom, WAFER_VIEW.top],
    z: [-WAFER_VIEW.depth, WAFER_VIEW.depth],
  },
  lightPath: {
    x: LIGHT_PATH_VIEW.x,
    y: LIGHT_PATH_VIEW.y,
    z: [-LIGHT_PATH_VIEW.depth, LIGHT_PATH_VIEW.depth],
  },
  projection: { x: OPTICS_VIEW.x, y: OPTICS_VIEW.y, z: [-OPTICS_VIEW.depth, OPTICS_VIEW.depth] },
};

const resolve = localRegions(VIEW_REGION_SPECS as Readonly<Record<RegionId, RegionSpec>>);

export function viewRegion(id: RegionId, rootMatrix: Matrix4): Box3 | null {
  return VIEW_REGION_SPECS[id] ? resolve(id, rootMatrix) : null;
}
