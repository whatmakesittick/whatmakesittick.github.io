import type { RegionSpec } from '@core/scene/regions';
import { HARPSICHORD, keyX } from '../../../model';

const HALF_DEPTH = 0.03;
const SPAN = { y: [0.69, 1.32], z: [-0.47, HARPSICHORD.offsetZ + 0.01] } as const;

export function lineUpRegionSpec(key: number): RegionSpec {
  const x = keyX(key);
  return { x: [x - HALF_DEPTH, x + HALF_DEPTH], y: SPAN.y, z: SPAN.z };
}
