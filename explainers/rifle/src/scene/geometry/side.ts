import { ExtrudeGeometry } from 'three';
import type { BufferGeometry, Shape } from 'three';
import type { Extent } from '../../model/scale';

const CURVE_SEGMENTS = 12;
const BEVEL_SEGMENTS = 3;
const QUARTER_TURN = Math.PI / 2;

function extrude(shape: Shape, length: number, bevel: number): ExtrudeGeometry {
  return new ExtrudeGeometry(shape, {
    depth: length - 2 * bevel,
    curveSegments: CURVE_SEGMENTS,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: BEVEL_SEGMENTS,
  });
}

export function extrudeSide(shape: Shape, z: Extent, bevel = 0): BufferGeometry {
  return extrude(shape, z[1] - z[0], bevel).translate(0, 0, z[0] + bevel);
}

export function extrudeAlongX(shape: Shape, x: Extent, bevel = 0): BufferGeometry {
  const geometry = extrude(shape, x[1] - x[0], bevel);
  geometry.rotateY(-QUARTER_TURN);
  return geometry.translate(x[1] - bevel, 0, 0);
}
