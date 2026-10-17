import { BufferAttribute, Color } from 'three';
import type { BufferGeometry } from 'three';

const RGB = 3;
const UV = 2;

export function tinted(geometry: BufferGeometry, colour: string): BufferGeometry {
  const { r, g, b } = new Color(colour);
  const count = geometry.getAttribute('position').count;
  const colours = new Float32Array(count * RGB);
  for (let index = 0; index < count; index += 1) colours.set([r, g, b], index * RGB);
  geometry.setAttribute('color', new BufferAttribute(colours, RGB));
  return geometry;
}

export function pinnedUv(geometry: BufferGeometry, u: number, v: number): BufferGeometry {
  const count = geometry.getAttribute('position').count;
  const uvs = new Float32Array(count * UV);
  for (let index = 0; index < count; index += 1) uvs.set([u, v], index * UV);
  geometry.setAttribute('uv', new BufferAttribute(uvs, UV));
  return geometry;
}
