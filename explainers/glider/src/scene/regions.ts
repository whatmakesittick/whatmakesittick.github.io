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
  overview: { x: [-185, 170], y: [0, 190], z: [-50, 40] },
  thermal: { x: [FIELD.x - 28, FIELD.x + 46], y: [0, 92], z: [FIELD.z - 24, FIELD.z + 24] },
  cloud: {
    x: [CUMULUS_CENTER.x - 40, CUMULUS_CENTER.x + 36],
    y: [CUMULUS_CENTER.y - 34, CUMULUS_CENTER.y + 22],
    z: [CUMULUS_CENTER.z - 24, CUMULUS_CENTER.z + 24],
  },
  ridge: { x: [-70, 4], y: [0, 82], z: [-34, 34] },
  wave: { x: [36, 150], y: [40, 162], z: [-30, 10] },
};

export function regionBox(id: RegionId): Box3 {
  const { x, y, z } = REGIONS[id];
  return new Box3(new Vector3(x[0], y[0], z[0]), new Vector3(x[1], y[1], z[1]));
}
