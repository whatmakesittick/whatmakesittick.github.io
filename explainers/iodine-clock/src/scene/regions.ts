import type { Box3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { worldRegionSpec } from '../model';

export function regionBox(id: RegionId): Box3 {
  return regionFromSpec(worldRegionSpec(id));
}
