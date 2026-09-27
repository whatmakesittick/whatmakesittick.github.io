import { ConeGeometry, CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';

export interface ArrowShape {
  shaftRadius: number;
  headRadius: number;
  headLength: number;
  radialSegments: number;
}

export function unitShaft(shape: ArrowShape): BufferGeometry {
  const geometry = new CylinderGeometry(
    shape.shaftRadius,
    shape.shaftRadius,
    1,
    shape.radialSegments,
  );
  geometry.translate(0, 1 / 2, 0);
  return geometry;
}

export function arrowHead(shape: ArrowShape): BufferGeometry {
  const geometry = new ConeGeometry(shape.headRadius, shape.headLength, shape.radialSegments);
  geometry.translate(0, -shape.headLength / 2, 0);
  return geometry;
}
