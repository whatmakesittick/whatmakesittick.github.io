import { BufferAttribute, Color } from 'three';
import type { BufferGeometry, ColorRepresentation } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const RGB = 3;
const KEPT_ATTRIBUTES = ['position', 'normal', 'color'] as const;
const scratch = new Color();

export function paint(geometry: BufferGeometry, color: ColorRepresentation): BufferGeometry {
  scratch.set(color);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * RGB);
  for (let index = 0; index < count; index++) scratch.toArray(colors, index * RGB);
  geometry.setAttribute('color', new BufferAttribute(colors, RGB));
  return geometry;
}

function prepared(geometry: BufferGeometry, keepColor: boolean, keepUv: boolean): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  Object.keys(flat.attributes).forEach((name) => {
    const kept = (KEPT_ATTRIBUTES as readonly string[]).includes(name) || (keepUv && name === 'uv');
    if (!kept || (name === 'color' && !keepColor)) flat.deleteAttribute(name);
  });
  return flat;
}

export function merge(parts: readonly BufferGeometry[], keepUv = false): BufferGeometry {
  const keepColor = parts.every((part) => part.getAttribute('color') !== undefined);
  const flats = parts.map((part) => prepared(part, keepColor, keepUv));
  const merged = mergeGeometries(flats);
  flats.forEach((part) => part.dispose());
  return merged;
}

export function mergePainted(
  parts: readonly (readonly [BufferGeometry, ColorRepresentation])[],
): BufferGeometry {
  return merge(parts.map(([geometry, color]) => paint(geometry, color)));
}

export interface NormalPaint {
  top: ColorRepresentation;
  side: ColorRepresentation;
  bottom: ColorRepresentation;
}

const FACING = 0.5;
const topColor = new Color();
const sideColor = new Color();
const bottomColor = new Color();

export function paintByNormal(geometry: BufferGeometry, paint: NormalPaint): BufferGeometry {
  topColor.set(paint.top);
  sideColor.set(paint.side);
  bottomColor.set(paint.bottom);
  const normals = geometry.getAttribute('normal');
  const colors = new Float32Array(normals.count * RGB);
  for (let index = 0; index < normals.count; index++) {
    const y = normals.getY(index);
    const color = y > FACING ? topColor : y < -FACING ? bottomColor : sideColor;
    color.toArray(colors, index * RGB);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, RGB));
  return geometry;
}
