import { Float32BufferAttribute } from 'three';
import type { BufferGeometry } from 'three';
import { box } from '@core/scene/geometry/box';
import type { BoxBounds } from '@core/scene/geometry/box';
import { pinnedUv } from '../gear/attributes';
import type { RowSwatch, SwatchUv, Uv } from './swatch';

const UV = 2;
const TRIANGLE = 3;

export function painted(geometry: BufferGeometry, swatch: RowSwatch, uv: SwatchUv): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  return pinnedUv(flat, ...uv(swatch));
}

export function paintTriangles(
  geometry: BufferGeometry,
  uvOf: (triangle: number) => Uv,
): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  const count = flat.getAttribute('position').count;
  const values = new Float32Array(count * UV);
  for (let vertex = 0; vertex < count; vertex += 1) {
    values.set(uvOf(Math.floor(vertex / TRIANGLE)), vertex * UV);
  }
  flat.setAttribute('uv', new Float32BufferAttribute(values, UV));
  return flat;
}

export function paintedBox(bounds: BoxBounds, swatch: RowSwatch, uv: SwatchUv): BufferGeometry {
  return painted(box(bounds), swatch, uv);
}

export function mirroredBoxes(
  bounds: BoxBounds,
  swatch: RowSwatch,
  uv: SwatchUv,
): BufferGeometry[] {
  const opposite = { ...bounds, minZ: -bounds.maxZ, maxZ: -bounds.minZ };
  return [paintedBox(bounds, swatch, uv), paintedBox(opposite, swatch, uv)];
}
