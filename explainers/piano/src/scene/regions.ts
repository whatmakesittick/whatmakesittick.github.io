import type { Box3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { regionSpecFor } from '../model';
import type { RegionOptions } from '../model';
import { lineUpRegionSpec } from './parts/ghosts/lineUpRegion';

export function regionFor(id: RegionId, key: number, options: RegionOptions): Box3 {
  if (id === 'lineUp') return regionFromSpec(lineUpRegionSpec(key));
  return regionFromSpec(regionSpecFor(id, key, options));
}
