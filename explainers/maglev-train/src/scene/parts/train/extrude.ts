import { ExtrudeGeometry } from 'three';
import type { BufferGeometry, Shape } from 'three';

const QUARTER_TURN = Math.PI / 2;
const CURVE_SEGMENTS = 3;
const BEVEL_SEGMENTS = 1;

function bevelled(shape: Shape, depth: number, bevel: number): ExtrudeGeometry {
  return new ExtrudeGeometry(shape, {
    depth: Math.max(1e-4, depth - 2 * bevel),
    curveSegments: CURVE_SEGMENTS,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: BEVEL_SEGMENTS,
  });
}

export function bevelledAlongX(
  shape: Shape,
  start: number,
  end: number,
  bevel: number,
): BufferGeometry {
  const geometry = bevelled(shape, end - start, bevel);
  geometry.rotateY(-QUARTER_TURN);
  geometry.translate(end - bevel, 0, 0);
  return geometry;
}

export function bevelledAlongZ(
  shape: Shape,
  near: number,
  far: number,
  bevel: number,
): BufferGeometry {
  const geometry = bevelled(shape, far - near, bevel);
  geometry.translate(0, 0, near + bevel);
  return geometry;
}
