import { BoxGeometry, CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';

const RADIAL_SEGMENTS = 24;

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function box(bounds: Bounds): BufferGeometry {
  const { minX, maxX, minY, maxY, minZ, maxZ } = bounds;
  const geometry = new BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ);
  geometry.translate((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  return geometry;
}

export function verticalCylinder(
  radius: number,
  bottom: number,
  top: number,
  segments: number = RADIAL_SEGMENTS,
): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, top - bottom, segments);
  geometry.translate(0, (top + bottom) / 2, 0);
  return geometry;
}

export function cylinderAlongX(
  radius: number,
  start: number,
  end: number,
  segments: number = RADIAL_SEGMENTS,
): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, end - start, segments);
  geometry.rotateZ(-Math.PI / 2);
  geometry.translate((start + end) / 2, 0, 0);
  return geometry;
}

export function cylinderAlongZ(
  radius: number,
  start: number,
  end: number,
  segments: number = RADIAL_SEGMENTS,
): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, end - start, segments);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 0, (start + end) / 2);
  return geometry;
}
