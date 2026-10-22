import {
  BufferAttribute,
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from '../random';

export const TREE_KINDS = ['round', 'poplar', 'conifer'] as const;
export type TreeKind = (typeof TREE_KINDS)[number];
export type Detail = 'near' | 'far';

type Rgb = readonly [number, number, number];

const TRUNK_COLOUR: Rgb = [0.55, 0.42, 0.35];
const CROWN_COLOUR: Rgb = [1, 1, 1];
const LUMP = 0.16;
const LUMP_SEED = 41;
const TIER_INSET = 0.62;

interface TrunkShape {
  readonly top: number;
  readonly bottom: number;
  readonly height: number;
}

interface BlobShape {
  readonly radius: readonly [number, number, number];
  readonly centre: number;
}

const TRUNK_SIDES: Readonly<Record<Detail, number>> = { near: 5, far: 4 };
const BLOB_DETAIL: Readonly<Record<Detail, number>> = { near: 1, far: 0 };
const CONIFER_SIDES: Readonly<Record<Detail, number>> = { near: 6, far: 4 };
const CONIFER_TIERS: Readonly<Record<Detail, number>> = { near: 3, far: 2 };

export const TREE_SHAPES = {
  round: {
    crown: { radius: [3.6, 2.95, 3.6], centre: 6.6 },
    trunk: { top: 0.18, bottom: 0.28, height: 4.2 },
  },
  poplar: {
    crown: { radius: [1.7, 5.6, 1.7], centre: 8.2 },
    trunk: { top: 0.14, bottom: 0.26, height: 3.4 },
  },
  conifer: {
    crown: { radius: 2.5, base: 2.2, height: 13.5 },
    trunk: { top: 0.16, bottom: 0.32, height: 3.2 },
  },
} as const;

function paint(geometry: BufferGeometry, [r, g, b]: Rgb): BufferGeometry {
  const count = geometry.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) colours.set([r, g, b], index * 3);
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  return geometry;
}

function stripped(geometry: BufferGeometry): BufferGeometry {
  geometry.deleteAttribute('uv');
  geometry.deleteAttribute('normal');
  const merged = mergeVertices(geometry);
  geometry.dispose();
  return merged;
}

function lumpy(geometry: BufferGeometry, centre: Vector3, scale: Vector3): BufferGeometry {
  const merged = stripped(geometry);
  const random = seededRandom(LUMP_SEED);
  const position = merged.getAttribute('position');
  const point = new Vector3();
  const normals = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index).sub(centre);
    point.multiplyScalar(1 + (random() * 2 - 1) * LUMP);
    normals.set(point.clone().divide(scale).normalize().toArray(), index * 3);
    point.add(centre);
    position.setXYZ(index, point.x, point.y, point.z);
  }
  merged.setAttribute('normal', new BufferAttribute(normals, 3));
  return merged;
}

function trunk({ top, bottom, height }: TrunkShape, detail: Detail): BufferGeometry {
  const geometry = new CylinderGeometry(top, bottom, height, TRUNK_SIDES[detail], 1, true);
  geometry.translate(0, height / 2, 0);
  geometry.deleteAttribute('uv');
  return paint(mergeVertices(geometry), TRUNK_COLOUR);
}

function blobCrown({ radius, centre }: BlobShape, detail: Detail): BufferGeometry {
  const geometry = new IcosahedronGeometry(1, BLOB_DETAIL[detail]);
  const scale = new Vector3(...radius);
  geometry.scale(scale.x, scale.y, scale.z);
  geometry.translate(0, centre, 0);
  return paint(lumpy(geometry, new Vector3(0, centre, 0), scale), CROWN_COLOUR);
}

function coniferProfile(detail: Detail): Vector2[] {
  const { radius, base, height } = TREE_SHAPES.conifer.crown;
  const tiers = CONIFER_TIERS[detail];
  const points = [new Vector2(0, base)];
  for (let tier = 0; tier < tiers; tier += 1) {
    const bottom = base + (height * tier) / tiers;
    const reach = radius * (1 - tier / tiers);
    points.push(new Vector2(reach, bottom + height * 0.04));
    points.push(new Vector2(reach * TIER_INSET, bottom + height / tiers));
  }
  points.push(new Vector2(0, base + height));
  return points;
}

function coniferCrown(detail: Detail): BufferGeometry {
  const { radius, base, height } = TREE_SHAPES.conifer.crown;
  const geometry = new LatheGeometry(coniferProfile(detail), CONIFER_SIDES[detail]);
  const centre = new Vector3(0, base + height * 0.35, 0);
  return paint(lumpy(geometry, centre, new Vector3(radius, height / 2, radius)), CROWN_COLOUR);
}

function crown(kind: TreeKind, detail: Detail): BufferGeometry {
  if (kind === 'conifer') return coniferCrown(detail);
  return blobCrown(TREE_SHAPES[kind].crown, detail);
}

export function treeGeometry(kind: TreeKind, detail: Detail): BufferGeometry {
  const parts = [crown(kind, detail), trunk(TREE_SHAPES[kind].trunk, detail)];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}
