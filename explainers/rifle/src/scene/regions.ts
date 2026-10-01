import type { RegionSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import {
  BARREL,
  CARRIER,
  CARRIER_STROKE,
  CARTRIDGE,
  GAS_BLOCK,
  RECEIVER,
  RIFLE_EXTENT,
  STOCK,
  TRIGGER_GUARD,
} from '../model/layout';
import type { Box } from '../model/scale';
import { CASE_FLIGHT, COMPENSATOR, FRONT_SIGHT_BASE, MAGAZINE_BOTTOM } from './constants';

const SCENE_MARGIN = 120;
const FLOOR_GAP = 2;

export const RIFLE_BOUNDS: Box = {
  x: [STOCK.x[0], COMPENSATOR.x[1]],
  y: [MAGAZINE_BOTTOM, FRONT_SIGHT_BASE.ears.y[1]],
  z: RIFLE_EXTENT.z,
};

export const REGIONS: Readonly<Record<RegionId, RegionSpec>> = {
  scene: {
    x: [RIFLE_BOUNDS.x[0] - SCENE_MARGIN, RIFLE_BOUNDS.x[1] + SCENE_MARGIN],
    y: [MAGAZINE_BOTTOM - FLOOR_GAP, RIFLE_BOUNDS.y[1] + SCENE_MARGIN],
    z: [-SCENE_MARGIN, CASE_FLIGHT.right + SCENE_MARGIN / 2],
  },
  rifle: RIFLE_BOUNDS,
  receiver: { x: [-200, 15], y: [TRIGGER_GUARD.y[0], RECEIVER.y[1]], z: [-16, 20] },
  chamber: { x: [-25, CARTRIDGE.length + 6], y: [-14, 16], z: [-12, 12] },
  barrel: { x: [BARREL.x[0], COMPENSATOR.x[1]], y: [-20, 30], z: [-12, 12] },
  gasSystem: { x: [CARRIER.x[0], GAS_BLOCK.x[1]], y: [-15, 40], z: [-14, 16] },
  reloadBay: {
    x: [CARRIER.x[0] - CARRIER_STROKE, 30],
    y: [-110, 40],
    z: [RECEIVER.z[0], 30],
  },
};
