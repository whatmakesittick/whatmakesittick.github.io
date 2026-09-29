import type { RegionSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import {
  BOOSTER,
  BOOSTER_AXIS,
  CHAMBER,
  ENGINE_EXTENT,
  INJECTOR,
  NOZZLE_EXIT,
  PLUME_EXTENT,
  PREBURNERS,
  THROAT,
  THRUST_MOUNT,
  TURBOPUMPS,
  pad,
} from '../model';

const HERO_PLUME_CM = 250;
const BOOSTER_PLUME_CM = 800;
const SEA_LEVEL_PLUME_CM = 1400;
const REGION_MARGIN = 4;

const PLUME_WIDTH = PLUME_EXTENT.x[1];

export const REGIONS: Readonly<Record<RegionId, RegionSpec>> = {
  scene: {
    x: [-PLUME_WIDTH, PLUME_WIDTH],
    y: [NOZZLE_EXIT.y - SEA_LEVEL_PLUME_CM, THRUST_MOUNT.top],
    z: [-PLUME_WIDTH, PLUME_WIDTH],
  },
  engine: ENGINE_EXTENT,
  hero: {
    x: [-80, 80],
    y: [NOZZLE_EXIT.y - HERO_PLUME_CM, THRUST_MOUNT.top],
    z: [-70, 70],
  },
  powerhead: { x: [-80, 80], y: [INJECTOR.y - 5, THRUST_MOUNT.top], z: [-40, 40] },
  turbopumps: pad(
    {
      x: [
        PREBURNERS.oxygen.centre[0] - PREBURNERS.oxygen.radius,
        PREBURNERS.methane.centre[0] + PREBURNERS.methane.radius,
      ],
      y: [TURBOPUMPS.oxygen.bottom, TURBOPUMPS.oxygen.top],
      z: [-16, 16],
    },
    REGION_MARGIN,
  ),
  chamber: { x: [-30, 30], y: [THROAT.y - 13, CHAMBER.top + 7], z: [-25, 25] },
  nozzle: {
    x: [-NOZZLE_EXIT.radius - 6, NOZZLE_EXIT.radius + 6],
    y: [NOZZLE_EXIT.y - 2, THROAT.y + 2],
    z: [-NOZZLE_EXIT.radius - 6, NOZZLE_EXIT.radius + 6],
  },
  nozzleAndPlume: {
    x: [-PLUME_WIDTH, PLUME_WIDTH],
    y: [NOZZLE_EXIT.y - SEA_LEVEL_PLUME_CM - 90, THROAT.y + 2],
    z: [-PLUME_WIDTH, PLUME_WIDTH],
  },
  booster: {
    x: [BOOSTER_AXIS.x - BOOSTER.radius, BOOSTER_AXIS.x + BOOSTER.radius],
    y: [NOZZLE_EXIT.y - BOOSTER_PLUME_CM, BOOSTER.skirtTop],
    z: [BOOSTER_AXIS.z - BOOSTER.radius, BOOSTER_AXIS.z + BOOSTER.radius],
  },
};
