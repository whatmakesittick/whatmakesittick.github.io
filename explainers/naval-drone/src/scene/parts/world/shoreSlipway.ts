import { BufferAttribute, BufferGeometry } from 'three';
import type { Mesh } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import { SLIPWAY } from '../../../model/layout';
import { SLIPWAY_WORKS, slabTop } from '../../geometry/shoreTerrain';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { SLIPWAY_MAP, slipwayRoughness, slipwayTexture, slipwayUv } from './shoreMaps';

type Corner = readonly [x: number, y: number, z: number];
type Quad = readonly [Corner, Corner, Corner, Corner];
type Facing = 'top' | 'side' | 'end';

export const SLIPWAY_SHAPE = {
  kerb: { width: SLIPWAY_MAP.kerbWidth, height: 0.18, end: 0 },
  finish: { roughness: 1, metalness: 0, envMapIntensity: 0.5 },
} as const;

const XYZ = 3;
const UV = 2;
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];
const SIDES = [-1, 1] as const;

function bottom(x: number): number {
  return slabTop(x) - SLIPWAY_WORKS.thickness;
}

function kerbTop(x: number): number {
  return slabTop(x) + SLIPWAY_SHAPE.kerb.height;
}

function sideUv([x, y]: Corner): [number, number] {
  return slipwayUv(x, SLIPWAY_MAP.sideBand[0] + y - bottom(x));
}

function endUv([x, y, z]: Corner): [number, number] {
  const across = SLIPWAY_MAP.plainX[0] + (z - SLIPWAY_MAP.z[0]);
  return slipwayUv(across, SLIPWAY_MAP.sideBand[0] + y - bottom(x));
}

const UV_BY_FACING: Readonly<Record<Facing, (corner: Corner) => [number, number]>> = {
  top: ([x, , z]) => slipwayUv(x, z),
  side: sideUv,
  end: endUv,
};

function quad(corners: Quad, facing: Facing): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(corners.flat()), XYZ));
  const uvs = corners.flatMap((corner) => UV_BY_FACING[facing](corner));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), UV));
  geometry.setIndex(QUAD_INDEX);
  geometry.computeVertexNormals();
  return geometry;
}

function deck(from: number, to: number, halfWidth: number): BufferGeometry {
  return quad(
    [
      [from, slabTop(from), -halfWidth],
      [from, slabTop(from), halfWidth],
      [to, slabTop(to), halfWidth],
      [to, slabTop(to), -halfWidth],
    ],
    'top',
  );
}

function rampTop(): BufferGeometry[] {
  const [x0, x1] = SLIPWAY.x;
  const { kerb } = SLIPWAY_SHAPE;
  return [deck(x0, kerb.end, SLIPWAY.z[1] - kerb.width), deck(kerb.end, x1, SLIPWAY.z[1])];
}

function mirrored(side: number, corners: Quad): Quad {
  return side > 0 ? corners : [corners[0], corners[3], corners[2], corners[1]];
}

function outerSide(side: number): BufferGeometry[] {
  const [x0, x1] = SLIPWAY.x;
  const end = SLIPWAY_SHAPE.kerb.end;
  const z = side * SLIPWAY.z[1];
  const face = (from: number, to: number, top: (x: number) => number) =>
    quad(
      mirrored(side, [
        [from, top(from), z],
        [from, bottom(from), z],
        [to, bottom(to), z],
        [to, top(to), z],
      ]),
      'side',
    );
  return [face(x0, end, kerbTop), face(end, x1, slabTop)];
}

function kerb(side: number): BufferGeometry[] {
  const x0 = SLIPWAY.x[0];
  const x1 = SLIPWAY_SHAPE.kerb.end;
  const outer = side * SLIPWAY.z[1];
  const inner = side * (SLIPWAY.z[1] - SLIPWAY_SHAPE.kerb.width);
  const faces: [Quad, Facing][] = [
    [
      [
        [x0, kerbTop(x0), inner],
        [x0, kerbTop(x0), outer],
        [x1, kerbTop(x1), outer],
        [x1, kerbTop(x1), inner],
      ],
      'top',
    ],
    [
      [
        [x0, slabTop(x0), inner],
        [x0, kerbTop(x0), inner],
        [x1, kerbTop(x1), inner],
        [x1, slabTop(x1), inner],
      ],
      'side',
    ],
    [
      [
        [x0, slabTop(x0), outer],
        [x0, kerbTop(x0), outer],
        [x0, kerbTop(x0), inner],
        [x0, slabTop(x0), inner],
      ],
      'end',
    ],
    [
      [
        [x1, kerbTop(x1), outer],
        [x1, slabTop(x1), outer],
        [x1, slabTop(x1), inner],
        [x1, kerbTop(x1), inner],
      ],
      'end',
    ],
  ];
  return faces.map(([corners, facing]) => quad(mirrored(side, corners), facing));
}

function toe(): BufferGeometry {
  const x = SLIPWAY.x[1];
  const [z0, z1] = SLIPWAY.z;
  return quad(
    [
      [x, slabTop(x), z1],
      [x, bottom(x), z1],
      [x, bottom(x), z0],
      [x, slabTop(x), z0],
    ],
    'end',
  );
}

function apron(): BufferGeometry[] {
  const [x0, x1] = SLIPWAY_WORKS.apron.x;
  const [z0, z1] = SLIPWAY_WORKS.apron.z;
  const top = SLIPWAY.top;
  const base = top - SLIPWAY_WORKS.thickness;
  const front = (from: number, to: number): BufferGeometry =>
    quad(
      [
        [x1, top, to],
        [x1, base, to],
        [x1, base, from],
        [x1, top, from],
      ],
      'end',
    );
  return [
    quad(
      [
        [x0, top, z0],
        [x0, top, z1],
        [x1, top, z1],
        [x1, top, z0],
      ],
      'top',
    ),
    quad(
      [
        [x0, top, z0],
        [x0, base, z0],
        [x0, base, z1],
        [x0, top, z1],
      ],
      'end',
    ),
    quad(
      [
        [x0, top, z0],
        [x1, top, z0],
        [x1, base, z0],
        [x0, base, z0],
      ],
      'side',
    ),
    quad(
      [
        [x0, base, z1],
        [x1, base, z1],
        [x1, top, z1],
        [x0, top, z1],
      ],
      'side',
    ),
    front(z0, SLIPWAY.z[0]),
    front(SLIPWAY.z[1], z1),
  ];
}

export function slipwayGeometry(): BufferGeometry {
  return mergeParts([
    ...rampTop(),
    ...SIDES.flatMap(kerb),
    ...SIDES.flatMap(outerSide),
    toe(),
    ...apron(),
  ]);
}

export function createSlipway(context: PartContext): Mesh {
  const finish: MaterialFinish = {
    color: '#ffffff',
    map: context.tracker.track(slipwayTexture()),
    roughnessMap: context.tracker.track(slipwayRoughness()),
    ...SLIPWAY_SHAPE.finish,
  };
  const mesh = partMesh(context, slipwayGeometry(), STRUCTURE_GROUP, finish);
  mesh.name = 'slipway';
  return mesh;
}
