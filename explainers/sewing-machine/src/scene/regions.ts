import { localRegions } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import { BASE, BED, FREE_ARM, HANDWHEEL, SPOOL_TOP } from './constants';

export type RegionId = 'all' | 'needle' | 'bobbin' | 'thread' | 'feed';

const HANDWHEEL_OUTER = HANDWHEEL.inner + HANDWHEEL.width + HANDWHEEL.hubDepth;

const LOCAL_REGIONS: Record<RegionId, RegionSpec> = {
  all: {
    x: [FREE_ARM.left, HANDWHEEL_OUTER],
    y: [-BED.height, SPOOL_TOP],
    z: [-BASE.halfDepth, BASE.halfDepth],
  },
  needle: { x: [-5, 8], y: [-12.5, 2.5], z: [-7, 7] },
  bobbin: { x: [-16, 16], y: [-16, 4], z: [-4, 28] },
  thread: { x: [0, 10], y: [-3, 10], z: [-26, 0] },
  feed: { x: [-18, 10], y: [-4, 8], z: [-24, 16] },
};

export const regionBox = localRegions(LOCAL_REGIONS);
