import type { Box3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { REGIONS } from '../model/layout';

export function buildRegions(): Readonly<Record<RegionId, Box3>> {
  return Object.fromEntries(
    Object.entries(REGIONS).map(([id, spec]) => [id, regionFromSpec(spec)]),
  ) as Record<RegionId, Box3>;
}
