import type { Box3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { regionSpecFor } from '../model';
import type { RegionOptions } from '../model';
import { closeUpRegion, isCloseUpRegion } from './parts/action/closeUp';
import { lineUpRegionSpec } from './parts/ghosts/lineUpRegion';

export function regionFor(id: RegionId, key: number, options: RegionOptions): Box3 {
  if (id === 'lineUp') return regionFromSpec(lineUpRegionSpec(key));
  if (isCloseUpRegion(id)) return regionFromSpec(closeUpRegion(id, key, options));
  return regionFromSpec(regionSpecFor(id, key, options));
}
