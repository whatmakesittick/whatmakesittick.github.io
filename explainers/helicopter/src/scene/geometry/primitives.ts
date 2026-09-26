import { CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { RADIAL_SEGMENTS } from '../constants';

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

export function lateralCylinder(
  radius: number,
  length: number,
  segments: number = RADIAL_SEGMENTS,
): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, length, segments);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

export function unitRod(radius: number, segments: number): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, 1, segments);
  geometry.translate(0, 1 / 2, 0);
  return geometry;
}
