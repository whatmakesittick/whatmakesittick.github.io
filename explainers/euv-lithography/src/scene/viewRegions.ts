import type { Box3, Matrix4 } from 'three';
import { localRegions } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import type { Point, RegionId } from '../ids';
import { waypoint } from '../model/layout';

interface CloseView {
  halfWidth: number;
  below: number;
  above: number;
  depth: number;
}

const [MASK_X, MASK_Y] = waypoint('mask');

const MASK_VIEW = { halfWidth: 0.11, below: 0.3, above: 0.2, depth: 0.2 } as const;
const WAFER_VIEW: CloseView = { halfWidth: 0.3, below: 0.12, above: 0.12, depth: 0.25 };
const LIGHT_PATH_VIEW = { x: [-0.8, 4.6], y: [-1.2, 5.8], depth: 2 } as const;
const OPTICS_VIEW = { x: [2.6, 7.2], y: [-0.5, 3.8], depth: 2 } as const;

function closeRegion([x, y]: Point, view: CloseView): RegionSpec {
  return {
    x: [x - view.halfWidth, x + view.halfWidth],
    y: [y - view.below, y + view.above],
    z: [-view.depth, view.depth],
  };
}

export const VIEW_REGION_SPECS: Readonly<Partial<Record<RegionId, RegionSpec>>> = {
  maskStage: {
    x: [MASK_X - MASK_VIEW.halfWidth, MASK_X + MASK_VIEW.halfWidth],
    y: [MASK_Y - MASK_VIEW.below, MASK_Y + MASK_VIEW.above],
    z: [-MASK_VIEW.depth, MASK_VIEW.depth],
  },
  waferStage: closeRegion(waypoint('wafer'), WAFER_VIEW),
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
