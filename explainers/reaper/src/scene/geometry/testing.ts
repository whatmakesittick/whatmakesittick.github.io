import { Box3 } from 'three';
import type { BufferGeometry } from 'three';

export function boundsOf(geometry: BufferGeometry): Box3 {
  geometry.computeBoundingBox();
  return geometry.boundingBox ?? new Box3();
}
