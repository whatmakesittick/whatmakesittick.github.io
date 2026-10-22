import { Color, Float32BufferAttribute } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const RGB = 3;

export function bare(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  flat.deleteAttribute('uv');
  flat.clearGroups();
  return flat;
}

export function painted(geometry: BufferGeometry, tone: string): BufferGeometry {
  const flat = bare(geometry);
  const rgb = new Color(tone).toArray();
  const count = flat.getAttribute('position').count;
  const colours = Float32Array.from({ length: count * RGB }, (_, index) => rgb[index % RGB]);
  flat.setAttribute('color', new Float32BufferAttribute(colours, RGB));
  return flat;
}

export function merged(parts: readonly BufferGeometry[]): BufferGeometry {
  const geometry = mergeGeometries([...parts]);
  parts.forEach((part) => part.dispose());
  if (!geometry) throw new Error('Ghost geometries do not share attributes');
  return geometry;
}
