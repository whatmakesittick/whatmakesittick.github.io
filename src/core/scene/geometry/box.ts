import { BoxGeometry } from 'three';
import type { BufferGeometry } from 'three';

export interface BoxBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function box(bounds: BoxBounds): BufferGeometry {
  const { minX, maxX, minY, maxY, minZ, maxZ } = bounds;
  const geometry = new BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ);
  geometry.translate((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  return geometry;
}
