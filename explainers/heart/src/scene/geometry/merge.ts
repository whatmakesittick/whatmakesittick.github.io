import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mergeParts(parts: readonly BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries([...parts], false);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('The parts do not share the same attributes');
  return merged;
}
