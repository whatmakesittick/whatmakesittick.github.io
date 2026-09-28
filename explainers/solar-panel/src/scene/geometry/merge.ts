import { BufferAttribute } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEPT = ['position', 'normal', 'uv'] as const;
const UV_SIZE = 2;

function prepare(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  Object.keys(flat.attributes)
    .filter((name) => !(KEPT as readonly string[]).includes(name))
    .forEach((name) => flat.deleteAttribute(name));
  if (!flat.getAttribute('normal')) flat.computeVertexNormals();
  if (!flat.getAttribute('uv')) {
    const count = flat.getAttribute('position').count;
    flat.setAttribute('uv', new BufferAttribute(new Float32Array(count * UV_SIZE), UV_SIZE));
  }
  flat.clearGroups();
  return flat;
}

export function mergeParts(parts: readonly BufferGeometry[]): BufferGeometry {
  const prepared = parts.map(prepare);
  const merged = mergeGeometries(prepared, false);
  parts.forEach((part) => part.dispose());
  prepared.forEach((part) => part.dispose());
  if (!merged) throw new Error('Cannot merge the part geometries');
  return merged;
}
