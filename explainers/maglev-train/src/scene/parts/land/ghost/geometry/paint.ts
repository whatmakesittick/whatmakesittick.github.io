import { Color, Float32BufferAttribute } from 'three';
import type { BufferGeometry } from 'three';

const RGB = 3;

export function painted(geometry: BufferGeometry, tone: string): BufferGeometry {
  const rgb = new Color(tone).toArray();
  const count = geometry.getAttribute('position').count;
  const colours = Float32Array.from({ length: count * RGB }, (_, index) => rgb[index % RGB]);
  geometry.setAttribute('color', new Float32BufferAttribute(colours, RGB));
  return geometry;
}
