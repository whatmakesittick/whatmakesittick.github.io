import { CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { mergeParts } from '../context';
import { WHEEL, WHEEL_CENTRES } from './dimensions';

const WHEEL_SEGMENTS = 24;
const KEPT_ATTRIBUTES = new Set(['position', 'normal']);

function wheel([x, y, z]: readonly [number, number, number]): BufferGeometry {
  const geometry = new CylinderGeometry(
    WHEEL.radius,
    WHEEL.radius,
    WHEEL.tyreWidth,
    WHEEL_SEGMENTS,
  );
  geometry.rotateX(Math.PI / 2);
  geometry.translate(x, y, z);
  return geometry;
}

function bare(geometry: BufferGeometry): BufferGeometry {
  Object.keys(geometry.attributes)
    .filter((name) => !KEPT_ATTRIBUTES.has(name))
    .forEach((name) => geometry.deleteAttribute(name));
  return geometry;
}

export function carSilhouette(body: readonly BufferGeometry[]): BufferGeometry {
  return mergeParts([...body, ...WHEEL_CENTRES.map(wheel)].map(bare));
}
