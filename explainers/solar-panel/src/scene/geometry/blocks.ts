import type { BufferGeometry } from 'three';
import { box } from '@core/scene/geometry/box';
import type { Extent } from '../../model';

export function block(x: Extent, y: Extent, z: Extent): BufferGeometry {
  return box({ minX: x[0], maxX: x[1], minY: y[0], maxY: y[1], minZ: z[0], maxZ: z[1] });
}

export function around(centre: number, size: number): Extent {
  return [centre - size / 2, centre + size / 2];
}

export function grow(extent: Extent, amount: number): Extent {
  return [extent[0] - amount, extent[1] + amount];
}
