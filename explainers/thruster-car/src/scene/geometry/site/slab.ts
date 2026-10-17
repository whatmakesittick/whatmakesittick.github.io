import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Path,
  Shape,
  Vector3,
} from 'three';
import type { Footprint } from '../../../model/layout';
import { mergeParts } from '../../parts/context';
import type { Pit } from './pit';

export const SLAB = {
  thickness: 0.16,
  bevel: 0.035,
  bevelSegments: 2,
  linerOverlap: 0.01,
} as const;

const QUARTER_TURN = Math.PI / 2;
const XYZ = 3;
const UV = 2;
const QUAD = [0, 1, 2, 0, 2, 3];

function rectPath<T extends Path>(path: T, area: Footprint): T {
  const [x0, x1] = area.x;
  const [z0, z1] = area.z;
  path.moveTo(x0, z0);
  path.lineTo(x1, z0);
  path.lineTo(x1, z1);
  path.lineTo(x0, z1);
  path.closePath();
  return path;
}

export function slabGeometry(area: Footprint, hole: Footprint | null): BufferGeometry {
  const shape = rectPath(new Shape(), area);
  if (hole) shape.holes.push(rectPath(new Path(), hole));
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

function wall(
  corners: readonly Vector3[],
  normal: Vector3,
  uvs: readonly number[],
): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      corners.flatMap((c) => c.toArray()),
      XYZ,
    ),
  );
  geometry.setAttribute(
    'normal',
    new Float32BufferAttribute(
      corners.flatMap(() => normal.toArray()),
      XYZ,
    ),
  );
  geometry.setAttribute('uv', new Float32BufferAttribute([...uvs], UV));
  geometry.setIndex(QUAD);
  return geometry;
}

export function pitLinerGeometry(pit: Pit): BufferGeometry {
  const overlap = SLAB.linerOverlap;
  const [x0, x1] = [pit.x[0] - overlap, pit.x[1] + overlap];
  const [z0, z1] = [pit.z[0] - overlap, pit.z[1] + overlap];
  const top = -SLAB.thickness + overlap;
  const bottom = pit.floor;
  const depth = top - bottom;
  const corner = (x: number, y: number, z: number) => new Vector3(x, y, z);
  return mergeParts([
    wall(
      [
        corner(x0, bottom, z0),
        corner(x0, bottom, z1),
        corner(x1, bottom, z1),
        corner(x1, bottom, z0),
      ],
      new Vector3(0, 1, 0),
      [x0, z0, x0, z1, x1, z1, x1, z0],
    ),
    wall(
      [corner(x0, bottom, z0), corner(x1, bottom, z0), corner(x1, top, z0), corner(x0, top, z0)],
      new Vector3(0, 0, 1),
      [x0, 0, x1, 0, x1, depth, x0, depth],
    ),
    wall(
      [corner(x1, bottom, z1), corner(x0, bottom, z1), corner(x0, top, z1), corner(x1, top, z1)],
      new Vector3(0, 0, -1),
      [x1, 0, x0, 0, x0, depth, x1, depth],
    ),
    wall(
      [corner(x0, bottom, z1), corner(x0, bottom, z0), corner(x0, top, z0), corner(x0, top, z1)],
      new Vector3(1, 0, 0),
      [z1, 0, z0, 0, z0, depth, z1, depth],
    ),
    wall(
      [corner(x1, bottom, z0), corner(x1, bottom, z1), corner(x1, top, z1), corner(x1, top, z0)],
      new Vector3(-1, 0, 0),
      [z0, 0, z1, 0, z1, depth, z0, depth],
    ),
  ]);
}
