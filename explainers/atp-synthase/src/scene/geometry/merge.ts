import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function sameIndexing(parts: readonly BufferGeometry[]): BufferGeometry[] {
  if (parts.every((part) => part.index !== null)) return [...parts];
  return parts.map((part) => (part.index ? part.toNonIndexed() : part));
}

export function mergeParts(parts: readonly BufferGeometry[]): BufferGeometry {
  const uniform = sameIndexing(parts);
  const merged = mergeGeometries(uniform, false);
  new Set([...parts, ...uniform]).forEach((part) => part.dispose());
  if (!merged) throw new Error('The parts do not share the same attributes');
  return merged;
}
