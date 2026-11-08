import type { Box3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { CompareId, RegionId } from '../ids';
import { regionSpecFor } from '../model';
import type { RegionOptions } from '../model';
import { closeUpRegion, isCloseUpRegion } from './parts/action/closeUp';
import { lineUpRegionSpec } from './parts/ghosts/lineUpRegion';
import { stringRegionSpec } from './parts/interior/stringRegion';

export interface SceneRegionOptions extends RegionOptions {
  compare: CompareId;
}

export function regionFor(id: RegionId, key: number, options: SceneRegionOptions): Box3 {
  if (id === 'lineUp') return regionFromSpec(lineUpRegionSpec(key, options.compare));
  if (id === 'string') return regionFromSpec(stringRegionSpec(key));
  if (isCloseUpRegion(id)) return regionFromSpec(closeUpRegion(id, key, options));
  return regionFromSpec(regionSpecFor(id, key, options));
}
