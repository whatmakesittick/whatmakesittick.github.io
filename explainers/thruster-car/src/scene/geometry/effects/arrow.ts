import { ConeGeometry, CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';

const SHAFT_SEGMENTS = 14;
const HEAD_SEGMENTS = 20;
const HALF = 0.5;

export function unitShaft(): BufferGeometry {
  const geometry = new CylinderGeometry(1, 1, 1, SHAFT_SEGMENTS);
  geometry.translate(0, HALF, 0);
  return geometry;
}

export function unitHead(): BufferGeometry {
  const geometry = new ConeGeometry(1, 1, HEAD_SEGMENTS);
  geometry.translate(0, -HALF, 0);
  return geometry;
}
