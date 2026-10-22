import { ExtrudeGeometry } from 'three';
import type { BufferGeometry, Shape } from 'three';

export const CURVE_SEGMENTS = 3;

export function bevelledAlongZ(
  shape: Shape,
  near: number,
  far: number,
  bevel: number,
): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: far - near - 2 * bevel,
    curveSegments: CURVE_SEGMENTS,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
  });
  return geometry.translate(0, 0, near + bevel);
}
