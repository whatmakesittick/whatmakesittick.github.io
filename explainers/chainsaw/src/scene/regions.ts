import { Box3, Vector3 } from 'three';
import type { RegionId } from '../ids';
import { REGION_BOUNDS } from '../model';

export function regionBox(id: RegionId, lift: number): Box3 {
  const { min, max } = REGION_BOUNDS[id];
  return new Box3(new Vector3(...min), new Vector3(...max)).translate(new Vector3(0, lift, 0));
}
