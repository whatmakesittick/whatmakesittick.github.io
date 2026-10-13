import { Box3, Vector3 } from 'three';
import {
  KICKBACK_ENVELOPE_DEG,
  PULL_ROPE_SHARE,
  REGION_BOUNDS,
  SAW_GEOMETRY,
  STARTER_GEOMETRY,
  sweptBounds,
  unionBounds,
} from '../model';
import type { Point, RegionId } from '../ids';
import type { Bounds } from '../model';

const { powerhead, rearHandle, frontHandle, handGuardPivot, handGuardTop, rearGrip } = SAW_GEOMETRY;

const STARTER_FRAME_PAD = 0.012;
const SAW_CENTRE_Z = 0;

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

function padded({ min, max }: Bounds, pad: number): Bounds {
  return {
    min: [min[0] - pad, min[1] - pad, min[2] - pad],
    max: [max[0] + pad, max[1] + pad, max[2] + pad],
  };
}

function around(centre: Point, radius: number): Bounds {
  return padded({ min: centre, max: centre }, radius);
}

export function gripReach(): Point {
  const { gripRest, ropeDirection, ropeDrawM } = STARTER_GEOMETRY;
  const reach = PULL_ROPE_SHARE * ropeDrawM;
  const along = (axis: 0 | 1 | 2) => gripRest[axis] + ropeDirection[axis] * reach;
  return [along(0), along(1), along(2)];
}

function starterFraming(): Bounds {
  const { fuelCap, oilCap, decompressionValve } = SAW_GEOMETRY;
  const halfGrip = STARTER_GEOMETRY.gripLength / 2;
  const reach = gripReach();
  const parts = unionBounds(
    around(fuelCap.centre, fuelCap.radius),
    around(oilCap.centre, oilCap.radius),
    around(decompressionValve.centre, decompressionValve.radius),
    HAND_GUARD,
    {
      min: [reach[0] - halfGrip, reach[1], reach[2]],
      max: [reach[0] + halfGrip, reach[1], reach[2]],
    },
    {
      min: [powerhead.min[0], powerhead.min[1], powerhead.min[2]],
      max: [powerhead.max[0], powerhead.min[1], SAW_CENTRE_Z],
    },
  );
  return padded(parts, STARTER_FRAME_PAD);
}

const FRAMING_BOUNDS: Partial<Record<RegionId, Bounds>> = {
  cylinder: { min: [-0.06, 0.1, -0.045], max: [0.08, 0.262, 0.045] },
  starter: starterFraming(),
  kickback: kickbackFraming(),
};

export function regionBox(id: RegionId, lift: number): Box3 {
  const { min, max } = FRAMING_BOUNDS[id] ?? REGION_BOUNDS[id];
  return new Box3(new Vector3(...min), new Vector3(...max)).translate(new Vector3(0, lift, 0));
}
