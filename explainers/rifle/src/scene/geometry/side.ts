import { ExtrudeGeometry } from 'three';
import type { BufferGeometry, Shape } from 'three';
import type { Extent } from '../../model/scale';

const CURVE_SEGMENTS = 12;
const BEVEL_SEGMENTS = 3;

export function extrudeSide(shape: Shape, z: Extent, bevel = 0): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: z[1] - z[0] - 2 * bevel,
    curveSegments: CURVE_SEGMENTS,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: BEVEL_SEGMENTS,
  });
  geometry.translate(0, 0, z[0] + bevel);
  return geometry;
}
