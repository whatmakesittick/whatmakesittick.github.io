import type { BufferGeometry } from 'three';
import type { Extent } from '../../model';
import { block } from './blocks';
import { mergeParts } from './merge';

export interface PlanePoint {
  x: number;
  y: number;
}

function span(from: number, to: number, pad: number): Extent {
  return [Math.min(from, to) - pad, Math.max(from, to) + pad];
}

export function stripGeometry(
  points: readonly PlanePoint[],
  width: number,
  z: Extent,
): BufferGeometry {
  const half = width / 2;
  const pieces = points.slice(1).map((point, index) => {
    const from = points[index];
    return block(span(from.x, point.x, half), span(from.y, point.y, half), z);
  });
  return mergeParts(pieces);
}
