import type { Box3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import { REGION_IDS } from '../ids';
import type { RegionId } from '../ids';
import { REGION_SPECS } from '../model';

export function buildRegions(): Record<RegionId, Box3> {
  return Object.fromEntries(
    REGION_IDS.map((id) => [id, regionFromSpec(REGION_SPECS[id])]),
  ) as Record<RegionId, Box3>;
}
