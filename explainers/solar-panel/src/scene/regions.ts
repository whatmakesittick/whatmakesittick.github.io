import { Box3 } from 'three';
import type { Matrix4 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import {
  BULKHEAD,
  HINGE,
  HOUSE_WALL_BOTTOM_CM,
  INVERTER,
  METER,
  MODULE,
  PANEL_COUNT,
  PANEL_PITCH_CM,
  TERRACE,
  um,
} from '../model';
import { ANCHOR_LIFT_CM, COPING, DOWNPIPE, HOUSE, SLICE_VIEW, WINDOW } from './constants';
import { JUNCTION_BOX } from './geometry/junctionBox';
import { frameDrop, stackFront, stackLayout } from './geometry/stack';
import { BASE_RAIL, RAIL } from './geometry/tiltFrame';
import { SLICE_SIZE } from './geometry/sliceGeometry';

const EQUIPMENT_MARGIN_CM = 6;
const CABLE_ROOM_CM = 14;

export const HOUSE_REGION: RegionSpec = {
  x: [TERRACE.x[0] - HOUSE.cornice.reach, TERRACE.x[1] + HOUSE.cornice.reach],
  y: [HOUSE_WALL_BOTTOM_CM, BULKHEAD.height],
  z: [
    TERRACE.z[0] - HOUSE.cornice.reach - COPING.overhang,
    Math.max(TERRACE.z[1] + WINDOW.ledge.reach, DOWNPIPE.z + DOWNPIPE.radius),
  ],
};

export const INVERTER_REGION: RegionSpec = {
  x: [INVERTER.position.x, INVERTER.position.x + INVERTER.size.depth + EQUIPMENT_MARGIN_CM],
  y: [
    INVERTER.position.y - INVERTER.size.height / 2 - CABLE_ROOM_CM,
    Math.max(
      INVERTER.position.y + INVERTER.size.height / 2,
      METER.position.y + METER.size.height / 2,
    ) + EQUIPMENT_MARGIN_CM,
  ],
  z: [
    INVERTER.position.z - INVERTER.size.width / 2 - EQUIPMENT_MARGIN_CM,
    METER.position.z + METER.size.width / 2 + EQUIPMENT_MARGIN_CM,
  ],
};

const ARRAY_HALF_WIDTH = ((PANEL_COUNT - 1) / 2) * PANEL_PITCH_CM + MODULE.width / 2;

export const MOUNTING_REGION: RegionSpec = {
  x: [-ARRAY_HALF_WIDTH, ARRAY_HALF_WIDTH],
  y: [TERRACE.y, HINGE.y],
  z: BASE_RAIL.z,
};

export function moduleRegion(): RegionSpec {
  return {
    x: [-MODULE.width / 2, MODULE.width / 2],
    y: [0, MODULE.height],
    z: [-RAIL.depth, MODULE.depth],
  };
}

export function stackRegion(explode: number, tiltDeg: number): RegionSpec {
  const back = stackLayout(explode).backsheet.back - JUNCTION_BOX.depth - JUNCTION_BOX.lid.depth;
  return {
    x: [-MODULE.width / 2 - ANCHOR_LIFT_CM, MODULE.width / 2 + ANCHOR_LIFT_CM],
    y: [-frameDrop(explode, tiltDeg), MODULE.height],
    z: [Math.min(back, -RAIL.depth), Math.max(stackFront(explode), MODULE.depth) + ANCHOR_LIFT_CM],
  };
}

export function sliceRegion(): RegionSpec {
  return {
    x: [0, SLICE_SIZE.width],
    y: [-SLICE_SIZE.depth / 2 - ANCHOR_LIFT_CM, SLICE_SIZE.depth / 2],
    z: [0, SLICE_SIZE.height + um(SLICE_VIEW.entryUm)],
  };
}

export function regionIn(spec: RegionSpec, matrix?: Matrix4): Box3 {
  const box = regionFromSpec(spec);
  return matrix ? box.applyMatrix4(matrix) : box;
}

export function union(...boxes: readonly Box3[]): Box3 {
  return boxes.reduce((total, box) => total.union(box), new Box3());
}
