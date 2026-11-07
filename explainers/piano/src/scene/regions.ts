import type { Box3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { regionSpecFor } from '../model';
import type { RegionOptions } from '../model';

export function regionFor(id: RegionId, key: number, options: RegionOptions): Box3 {
  return regionFromSpec(regionSpecFor(id, key, options));
}
