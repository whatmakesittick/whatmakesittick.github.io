import type { RegionSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import {
  BARREL,
  CARRIER,
  CARRIER_STROKE,
  GAS_BLOCK,
  RECEIVER,
  RIFLE_EXTENT,
  STOCK,
} from '../model/layout';
import { pad } from '../model/scale';
import type { Box } from '../model/scale';
import { COMPENSATOR, FRONT_SIGHT_BASE, MAGAZINE_BOTTOM } from './constants';

const SCENE_MARGIN = 120;
const CASE_REACH = 70;

export const RIFLE_BOUNDS: Box = {
  x: [STOCK.x[0], COMPENSATOR.x[1]],
  y: [MAGAZINE_BOTTOM, FRONT_SIGHT_BASE.ears.y[1]],
  z: RIFLE_EXTENT.z,
};

export const REGIONS: Readonly<Record<RegionId, RegionSpec>> = {
  scene: pad(RIFLE_BOUNDS, SCENE_MARGIN),
  rifle: RIFLE_BOUNDS,
  receiver: { x: RECEIVER.x, y: [RECEIVER.y[0] - 10, RECEIVER.y[1] + 4], z: RECEIVER.z },
  chamber: { x: [-40, 70], y: [-24, 40], z: [-18, 18] },
  barrel: { x: [BARREL.x[0], COMPENSATOR.x[1]], y: [-30, 50], z: [-20, 20] },
  gasSystem: { x: [CARRIER.x[0], GAS_BLOCK.x[1]], y: [-20, 45], z: [-20, 20] },
  reloadBay: {
    x: [CARRIER.x[0] - CARRIER_STROKE, 40],
    y: [-120, 50],
    z: [RECEIVER.z[0], RECEIVER.z[1] + CASE_REACH],
  },
};
