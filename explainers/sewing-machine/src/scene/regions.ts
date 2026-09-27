import { Box3, Vector3 } from 'three';
import type { Matrix4 } from 'three';
import { BASE, BED, FREE_ARM, HANDWHEEL, SPOOL_TOP } from './constants';

export type RegionId = 'all' | 'reach' | 'needle' | 'bobbin' | 'thread' | 'feed';

type Extent = readonly [min: number, max: number];

interface RegionSpec {
  x: Extent;
  y: Extent;
  z: Extent;
}

const HANDWHEEL_OUTER = HANDWHEEL.inner + HANDWHEEL.width + HANDWHEEL.hubDepth;
const REACH_SHARE = 0.6;

function shrink([min, max]: Extent, share: number): Extent {
  const middle = (min + max) / 2;
  const half = ((max - min) / 2) * share;
  return [middle - half, middle + half];
}

const ALL: RegionSpec = {
  x: [FREE_ARM.left, HANDWHEEL_OUTER],
  y: [-BED.height, SPOOL_TOP],
  z: [-BASE.halfDepth, BASE.halfDepth],
};

const LOCAL_REGIONS: Record<RegionId, RegionSpec> = {
  all: ALL,
  reach: {
    x: shrink(ALL.x, REACH_SHARE),
    y: shrink(ALL.y, REACH_SHARE),
    z: shrink(ALL.z, REACH_SHARE),
  },
  needle: { x: [-5, 8], y: [-12.5, 2.5], z: [-7, 7] },
  bobbin: { x: [-16, 16], y: [-16, 4], z: [-4, 28] },
  thread: { x: [0, 10], y: [-3, 10], z: [-26, 0] },
  feed: { x: [-18, 10], y: [-4, 8], z: [-24, 16] },
};

function toBox(spec: RegionSpec): Box3 {
  return new Box3(
    new Vector3(spec.x[0], spec.y[0], spec.z[0]),
    new Vector3(spec.x[1], spec.y[1], spec.z[1]),
  );
}

export function regionBox(id: RegionId, rootMatrix: Matrix4): Box3 {
  return toBox(LOCAL_REGIONS[id]).applyMatrix4(rootMatrix);
}
