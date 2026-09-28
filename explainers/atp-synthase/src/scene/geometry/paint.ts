import { BufferAttribute, Color } from 'three';
import type { BufferGeometry } from 'three';

const RGB = 3;

export function painted(geometry: BufferGeometry, hex: string): BufferGeometry {
  const { r, g, b } = new Color(hex);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * RGB);
  for (let vertex = 0; vertex < count; vertex += 1) colors.set([r, g, b], vertex * RGB);
  geometry.setAttribute('color', new BufferAttribute(colors, RGB));
  return geometry;
}
