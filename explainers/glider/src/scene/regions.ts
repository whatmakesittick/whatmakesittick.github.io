import { Box3, Vector3 } from 'three';
import { FIELD } from '../model';
import { CUMULUS_CENTER } from './parts/clouds';

export type RegionId = 'reach' | 'overview' | 'thermal' | 'cloud' | 'ridge' | 'wave';

type Extent = readonly [min: number, max: number];

interface RegionSpec {
  x: Extent;
  y: Extent;
  z: Extent;
}

const REGIONS: Record<RegionId, RegionSpec> = {
  reach: { x: [-90, 90], y: [0, 120], z: [-40, 40] },
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

export function regionBox(id: RegionId): Box3 {
  const { x, y, z } = REGIONS[id];
  return new Box3(new Vector3(x[0], y[0], z[0]), new Vector3(x[1], y[1], z[1]));
}
