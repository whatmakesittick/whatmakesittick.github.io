import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CORNERS = 3;

export function mirroredZ(geometry: BufferGeometry): BufferGeometry {
  const copy = geometry.clone().scale(1, 1, -1);
  const order = copy.index
    ? Array.from(copy.index.array)
    : [...Array(copy.getAttribute('position').count).keys()];
  for (let at = 0; at < order.length; at += CORNERS) {
    [order[at + 1], order[at + 2]] = [order[at + 2], order[at + 1]];
  }
  copy.setIndex(order);
  return copy;
}

export function mergeAll(parts: readonly BufferGeometry[]): BufferGeometry {
  const indexed = parts.every((part) => part.index);
  const merged = mergeGeometries(
    parts.map((part) => {
      const uniform = indexed || !part.index ? part : part.toNonIndexed();
      Object.keys(uniform.attributes)
        .filter((name) => name !== 'position' && name !== 'normal')
        .forEach((name) => uniform.deleteAttribute(name));
      return uniform;
    }),
  );
  if (!merged) throw new Error('could not merge train geometries');
  parts.forEach((part) => part.dispose());
  return merged;
}

export function mirroredPair(right: BufferGeometry): BufferGeometry {
  return mergeAll([right, mirroredZ(right)]);
}
