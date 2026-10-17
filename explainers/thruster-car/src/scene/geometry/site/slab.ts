import { ExtrudeGeometry, Shape } from 'three';
import type { BufferGeometry } from 'three';
import { QUARTER_TURN } from '../turns';
import type { Footprint } from '../../../model/layout';

export const SLAB = {
  thickness: 0.16,
  bevel: 0.035,
  bevelSegments: 2,
} as const;

function rectPath(path: Shape, area: Footprint): Shape {
  const [x0, x1] = area.x;
  const [z0, z1] = area.z;
  path.moveTo(x0, z0);
  path.lineTo(x1, z0);
  path.lineTo(x1, z1);
  path.lineTo(x0, z1);
  path.closePath();
  return path;
}

export function slabGeometry(area: Footprint): BufferGeometry {
  const shape = rectPath(new Shape(), area);
  const { thickness, bevel, bevelSegments } = SLAB;
  const geometry = new ExtrudeGeometry(shape, {
    depth: thickness - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments,
    curveSegments: 1,
  });
  geometry.rotateX(QUARTER_TURN);
  geometry.translate(0, -bevel, 0);
  return geometry;
}
