import { BoxGeometry } from 'three';
import type { BufferGeometry } from 'three';

export type Corner = readonly [x: number, y: number, z: number];

export function boxBetween([minX, minY, minZ]: Corner, [maxX, maxY, maxZ]: Corner): BufferGeometry {
  const geometry = new BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ);
  geometry.translate((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  return geometry;
}
