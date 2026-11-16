import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function sharedAttributes(parts: readonly BufferGeometry[]): Set<string> {
  const [first, ...rest] = parts.map((part) => Object.keys(part.attributes));
  return new Set(first.filter((name) => rest.every((names) => names.includes(name))));
}

export function mergeParts(parts: readonly BufferGeometry[]): BufferGeometry {
  const shared = sharedAttributes(parts);
  const flat = parts.map((part) => {
    const plain = part.index ? part.toNonIndexed() : part;
    Object.keys(plain.attributes)
      .filter((name) => !shared.has(name))
      .forEach((name) => plain.deleteAttribute(name));
    return plain;
  });
  const merged = mergeGeometries(flat);
  new Set([...parts, ...flat]).forEach((part) => part.dispose());
  if (!merged) throw new Error('Merged parts need matching attributes');
  return merged;
}
