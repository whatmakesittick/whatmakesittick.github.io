import { localRegions } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import { ROTOR } from '../model';
import { HUB, MAST, SKIDS, TAIL_ROTOR } from './constants';

export type RegionId = 'all' | 'airframe' | 'plan' | 'hub' | 'tail';

const DISC_CLEARANCE = 0.45;
const AIRFRAME_REACH = { front: 0.75, side: 0.55 } as const;
const HUB_REACH = 1.3;
const HUB_BELOW = 0.15;
const TAIL_BOX = { front: -4.9, bottom: 0.85, top: 2.85, near: -0.95, far: 0.35 } as const;

const TAIL_END = TAIL_ROTOR.centerX - TAIL_ROTOR.radius;
const DISC_TOP = HUB.height + DISC_CLEARANCE;

const LOCAL_REGIONS: Record<RegionId, RegionSpec> = {
  all: {
    x: [TAIL_END, ROTOR.radiusMetres],
    y: [0, DISC_TOP],
    z: [-ROTOR.radiusMetres, ROTOR.radiusMetres],
  },
  airframe: {
    x: [TAIL_END, ROTOR.radiusMetres * AIRFRAME_REACH.front],
    y: [0, DISC_TOP],
    z: [-ROTOR.radiusMetres * AIRFRAME_REACH.side, ROTOR.radiusMetres * AIRFRAME_REACH.side],
  },
  plan: {
    x: [TAIL_END, ROTOR.radiusMetres],
    y: [SKIDS.tubeRadius, DISC_TOP],
    z: [-ROTOR.radiusMetres, ROTOR.radiusMetres],
  },
  hub: {
    x: [-HUB_REACH, HUB_REACH],
    y: [MAST.bottom - HUB_BELOW, DISC_TOP],
    z: [-HUB_REACH, HUB_REACH],
  },
  tail: {
    x: [TAIL_END, TAIL_BOX.front],
    y: [TAIL_BOX.bottom, TAIL_BOX.top],
    z: [TAIL_BOX.near, TAIL_BOX.far],
  },
};

export const regionBox = localRegions(LOCAL_REGIONS);
