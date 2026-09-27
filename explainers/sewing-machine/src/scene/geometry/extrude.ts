import { ExtrudeGeometry } from 'three';
import type { BufferGeometry, Shape } from 'three';

const CURVE_SEGMENTS = 6;

function extrude(shape: Shape, depth: number): ExtrudeGeometry {
  return new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: CURVE_SEGMENTS,
  });
}

export function extrudePlan(shape: Shape, bottom: number, top: number): BufferGeometry {
  const geometry = extrude(shape, top - bottom);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, top, 0);
  return geometry;
}

export function extrudeProfileAlongX(shape: Shape, start: number, end: number): BufferGeometry {
  const geometry = extrude(shape, end - start);
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(end, 0, 0);
  return geometry;
}
