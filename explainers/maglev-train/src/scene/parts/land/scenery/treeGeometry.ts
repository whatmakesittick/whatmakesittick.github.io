import {
  BufferAttribute,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from '../random';
import type { TreeKind } from './treePlacement';

const TRUNK_COLOUR = [0.55, 0.42, 0.35] as const;
const CROWN_COLOUR = [1, 1, 1] as const;
const LUMP = 0.16;
const LUMP_SEED = 41;

export type Detail = 'near' | 'far';

export const TREE_SHAPES = {
  round: {
    crown: { radius: 3.6, squash: 0.82, centre: 6.6, detail: { near: 1, far: 0 } },
    trunk: { top: 0.18, bottom: 0.28, height: 4.2, sides: { near: 5, far: 4 } },
  },
  conifer: {
    crown: {
      radius: 2.5,
      height: 13,
      base: 2.4,
      radial: { near: 7, far: 5 },
      rings: { near: 3, far: 2 },
    },
    trunk: { top: 0.16, bottom: 0.32, height: 3.4, sides: { near: 5, far: 4 } },
  },
} as const;

function paint(
  geometry: BufferGeometry,
  [r, g, b]: readonly [number, number, number],
): BufferGeometry {
  const count = geometry.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) colours.set([r, g, b], index * 3);
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  return geometry;
}

function lumpy(geometry: BufferGeometry, centre: Vector3): BufferGeometry {
  geometry.deleteAttribute('normal');
  const merged = mergeVertices(geometry);
  geometry.dispose();
  const random = seededRandom(LUMP_SEED);
  const position = merged.getAttribute('position');
  const point = new Vector3();
  const normals = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index).sub(centre);
    point.multiplyScalar(1 + (random() * 2 - 1) * LUMP);
    normals.set(point.clone().normalize().toArray(), index * 3);
    point.add(centre);
    position.setXYZ(index, point.x, point.y, point.z);
  }
  merged.setAttribute('normal', new BufferAttribute(normals, 3));
  return merged;
}

interface TrunkShape {
  readonly top: number;
  readonly bottom: number;
  readonly height: number;
  readonly sides: Readonly<Record<Detail, number>>;
}

function trunk({ top, bottom, height, sides }: TrunkShape, detail: Detail): BufferGeometry {
  const geometry = new CylinderGeometry(top, bottom, height, sides[detail], 1, true);
  geometry.translate(0, height / 2, 0);
  return paint(mergeVertices(stripUv(geometry)), TRUNK_COLOUR);
}

function roundCrown(detail: Detail): BufferGeometry {
  const { radius, squash, centre } = TREE_SHAPES.round.crown;
  const geometry = new IcosahedronGeometry(radius, TREE_SHAPES.round.crown.detail[detail]);
  geometry.deleteAttribute('uv');
  geometry.scale(1, squash, 1);
  geometry.translate(0, centre, 0);
  return paint(lumpy(geometry, new Vector3(0, centre, 0)), CROWN_COLOUR);
}

function coniferCrown(detail: Detail): BufferGeometry {
  const { radius, height, base, radial, rings } = TREE_SHAPES.conifer.crown;
  const geometry = new ConeGeometry(radius, height, radial[detail], rings[detail], false);
  geometry.deleteAttribute('uv');
  geometry.translate(0, base + height / 2, 0);
  return paint(lumpy(geometry, new Vector3(0, base + height * 0.3, 0)), CROWN_COLOUR);
}

function stripUv(geometry: BufferGeometry): BufferGeometry {
  if (geometry.getAttribute('uv')) geometry.deleteAttribute('uv');
  return geometry;
}

export function treeGeometry(kind: TreeKind, detail: Detail): BufferGeometry {
  const parts =
    kind === 'round'
      ? [roundCrown(detail), trunk(TREE_SHAPES.round.trunk, detail)]
      : [coniferCrown(detail), trunk(TREE_SHAPES.conifer.trunk, detail)];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}
