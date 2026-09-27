import { localRegions } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import { FIELD } from '../model';
import { CUMULUS_CENTER } from './parts/clouds';

export type RegionId = 'overview' | 'thermal' | 'cloud' | 'ridge' | 'wave';

const REGIONS: Record<RegionId, RegionSpec> = {
  overview: { x: [-222, 170], y: [0, 190], z: [-80, 55] },
  thermal: { x: [FIELD.x - 44, FIELD.x + 66], y: [0, 90], z: [FIELD.z - 16, FIELD.z + 16] },
  cloud: {
    x: [CUMULUS_CENTER.x - 60, CUMULUS_CENTER.x + 26],
    y: [CUMULUS_CENTER.y - 36, CUMULUS_CENTER.y + 22],
    z: [CUMULUS_CENTER.z - 16, CUMULUS_CENTER.z + 16],
  },
  ridge: { x: [-66, 4], y: [20, 76], z: [-50, 50] },
  wave: { x: [40, 140], y: [44, 160], z: [-34, 10] },
};

export const regionBox = localRegions(REGIONS);
