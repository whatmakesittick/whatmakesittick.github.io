import { Box3, Vector3 } from 'three';
import type { RegionId } from '../ids';
import { REGION_BOUNDS } from '../model';
import type { Bounds } from '../model';

const FRAMING_BOUNDS: Partial<Record<RegionId, Bounds>> = {
  cylinder: { min: [-0.06, 0.1, -0.045], max: [0.08, 0.262, 0.045] },
};

export function regionBox(id: RegionId, lift: number): Box3 {
  const { min, max } = FRAMING_BOUNDS[id] ?? REGION_BOUNDS[id];
  return new Box3(new Vector3(...min), new Vector3(...max)).translate(new Vector3(0, lift, 0));
}
