import { CylinderGeometry, IcosahedronGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TREE_SHAPE } from './constants';
import type { Lobe } from './constants';

const HALF = 0.5;

function lobeGeometry({ centre, radius, detail }: Lobe): BufferGeometry {
  const geometry = new IcosahedronGeometry(radius, detail);
  geometry.scale(1, TREE_SHAPE.squash, 1);
  geometry.translate(...centre);
  return geometry;
}

export function crownGeometry(lobes: readonly Lobe[]): BufferGeometry {
  const parts = lobes.map(lobeGeometry);
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

export function trunkGeometry(): BufferGeometry {
  const { top, bottom, height, sink, sides } = TREE_SHAPE.trunk;
  const geometry = new CylinderGeometry(top, bottom, height, sides, 1, true);
  geometry.translate(0, height * HALF - sink, 0);
  return geometry;
}
