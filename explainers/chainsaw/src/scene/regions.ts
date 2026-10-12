import { Box3, Vector3 } from 'three';
import type { RegionId } from '../ids';
import {
  KICKBACK_ENVELOPE_DEG,
  REGION_BOUNDS,
  SAW_GEOMETRY,
  sweptBounds,
  unionBounds,
} from '../model';
import type { Bounds } from '../model';

const { powerhead, rearHandle, frontHandle, handGuardPivot, handGuardTop, rearGrip } = SAW_GEOMETRY;

const HAND_GUARD: Bounds = {
  min: handGuardPivot,
  max: [handGuardPivot[0], handGuardTop, handGuardPivot[2]],
};

const SAW_SILHOUETTE: readonly Bounds[] = [
  powerhead,
  rearHandle,
  frontHandle,
  HAND_GUARD,
  REGION_BOUNDS.bar,
];

function kickbackFraming(): Bounds {
  const rise = unionBounds(
    ...SAW_SILHOUETTE.map((part) => sweptBounds(part, rearGrip, KICKBACK_ENVELOPE_DEG)),
  );
  const { min, max } = REGION_BOUNDS.kickback;
  return {
    min: [rise.min[0], rise.min[1], min[2]],
    max: [max[0], rise.max[1], max[2]],
  };
}

const FRAMING_BOUNDS: Partial<Record<RegionId, Bounds>> = {
  cylinder: { min: [-0.06, 0.1, -0.045], max: [0.08, 0.262, 0.045] },
  kickback: kickbackFraming(),
};

export function regionBox(id: RegionId, lift: number): Box3 {
  const { min, max } = FRAMING_BOUNDS[id] ?? REGION_BOUNDS[id];
  return new Box3(new Vector3(...min), new Vector3(...max)).translate(new Vector3(0, lift, 0));
}
