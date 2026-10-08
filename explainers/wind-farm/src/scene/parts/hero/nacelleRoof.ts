import type { BufferGeometry } from 'three';
import { box } from '@core/scene/geometry/box';
import { mergeParts } from '../../geometry/merge';
import { NACELLE } from './constants';

const TOP = NACELLE.maxY;
const HATCH = {
  minX: 0.2,
  maxX: 1.8,
  minZ: -1.45,
  maxZ: -0.35,
  frame: 0.12,
  lid: 0.06,
  rim: 0.08,
} as const;
const RAIL = {
  z: 1.62,
  fromX: -3.0,
  toX: 3.6,
  posts: 7,
  post: 0.06,
  height: 1.05,
  bars: [0.5, 1.05],
  bar: 0.045,
  sink: 0.06,
} as const;

export function hatchGeometry(): BufferGeometry {
  const frame = box({
    minX: HATCH.minX,
    maxX: HATCH.maxX,
    minY: TOP - HATCH.rim,
    maxY: TOP + HATCH.frame,
    minZ: HATCH.minZ,
    maxZ: HATCH.maxZ,
  });
  const lid = box({
    minX: HATCH.minX + HATCH.rim,
    maxX: HATCH.maxX - HATCH.rim,
    minY: TOP + HATCH.frame,
    maxY: TOP + HATCH.frame + HATCH.lid,
    minZ: HATCH.minZ + HATCH.rim,
    maxZ: HATCH.maxZ - HATCH.rim,
  });
  return mergeParts([frame, lid]);
}

export function railGeometry(side: number): BufferGeometry {
  const z = side * RAIL.z;
  const span = RAIL.toX - RAIL.fromX;
  const posts = Array.from({ length: RAIL.posts }, (_, index) => {
    const x = RAIL.fromX + (span * index) / (RAIL.posts - 1);
    return box({
      minX: x - RAIL.post / 2,
      maxX: x + RAIL.post / 2,
      minY: TOP - RAIL.sink,
      maxY: TOP + RAIL.height,
      minZ: z - RAIL.post / 2,
      maxZ: z + RAIL.post / 2,
    });
  });
  const bars = RAIL.bars.map((height) =>
    box({
      minX: RAIL.fromX - RAIL.post / 2,
      maxX: RAIL.toX + RAIL.post / 2,
      minY: TOP + height - RAIL.bar,
      maxY: TOP + height,
      minZ: z - RAIL.bar / 2,
      maxZ: z + RAIL.bar / 2,
    }),
  );
  return mergeParts([...posts, ...bars]);
}
