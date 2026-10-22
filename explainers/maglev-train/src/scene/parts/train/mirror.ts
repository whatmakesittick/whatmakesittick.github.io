import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CORNERS = 3;

function flipWinding(geometry: BufferGeometry): BufferGeometry {
  const index = geometry.getIndex();
  if (!index) return geometry;
  const values = index.array;
  for (let at = 0; at < values.length; at += CORNERS) {
    const swap = values[at + 1];
    values[at + 1] = values[at + 2];
    values[at + 2] = swap;
  }
  index.needsUpdate = true;
  return geometry;
}

export function mirroredZ(geometry: BufferGeometry): BufferGeometry {
  const copy = geometry.clone();
  copy.scale(1, 1, -1);
  if (copy.index) return flipWinding(copy);
  const position = copy.getAttribute('position');
  const normal = copy.getAttribute('normal');
  for (let at = 0; at < position.count; at += CORNERS) {
    [position, normal].forEach((attribute) => {
      if (!attribute) return;
      for (let axis = 0; axis < attribute.itemSize; axis += 1) {
        const swap = attribute.getComponent(at + 1, axis);
        attribute.setComponent(at + 1, axis, attribute.getComponent(at + 2, axis));
        attribute.setComponent(at + 2, axis, swap);
      }
    });
  }
  return copy;
}

export function mergeAll(parts: readonly BufferGeometry[]): BufferGeometry {
  const indexed = parts.every((part) => part.index);
  const uniform = indexed ? parts : parts.map((part) => (part.index ? part.toNonIndexed() : part));
  const merged = mergeGeometries(uniform.map(stripUvs));
  if (!merged) throw new Error('could not merge train geometries');
  parts.forEach((part) => part.dispose());
  return merged;
}

function stripUvs(geometry: BufferGeometry): BufferGeometry {
  Object.keys(geometry.attributes)
    .filter((name) => name !== 'position' && name !== 'normal')
    .forEach((name) => geometry.deleteAttribute(name));
  return geometry;
}

export function mirroredPair(right: BufferGeometry): BufferGeometry {
  return mergeAll([right, mirroredZ(right)]);
}
