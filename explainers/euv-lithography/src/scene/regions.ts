import type { Box3, Matrix4 } from 'three';
import { localRegions } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { REGION_SPECS } from '../model/layout';

const resolveRegion = localRegions(REGION_SPECS);

export function regionBox(id: RegionId, rootMatrix?: Matrix4): Box3 {
  return resolveRegion(id, rootMatrix);
}
