import type { Box3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { REGION_SPECS } from '../model/layout';

export function regionBox(id: RegionId): Box3 {
  return regionFromSpec(REGION_SPECS[id]);
}
