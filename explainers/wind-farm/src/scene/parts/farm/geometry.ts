import { BufferAttribute, Color, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box } from '@core/scene/geometry/box';
import type { Point } from '../../../ids';

const KEPT_ATTRIBUTES = new Set(['position', 'normal', 'color']);
const RGB = 3;
const UP = new Vector3(0, 1, 0);

function bare(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  Object.keys(flat.attributes).forEach((name) => {
    if (!KEPT_ATTRIBUTES.has(name)) flat.deleteAttribute(name);
  });
  return flat;
}

export function mergeParts(parts: readonly BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts.map(bare));
  if (!merged) throw new Error('Farm geometry parts do not share attributes');
  return merged;
}

export function tinted(geometry: BufferGeometry, colour: string): BufferGeometry {
  const flat = bare(geometry);
  const { r, g, b } = new Color(colour);
  const count = flat.getAttribute('position').count;
  const colours = new Float32Array(count * RGB);
  for (let index = 0; index < count; index += 1) colours.set([r, g, b], index * RGB);
  flat.setAttribute('color', new BufferAttribute(colours, RGB));
  return flat;
}

export function slab(min: Point, max: Point): BufferGeometry {
  const [minX, minY, minZ] = min;
  const [maxX, maxY, maxZ] = max;
  return box({ minX, maxX, minY, maxY, minZ, maxZ });
}

export function strut(from: Point, to: Point, thickness: number): BufferGeometry {
  const start = new Vector3(...from);
  const span = new Vector3(...to).sub(start);
  const length = span.length();
  const geometry = box({
    minX: -thickness / 2,
    maxX: thickness / 2,
    minY: 0,
    maxY: length,
    minZ: -thickness / 2,
    maxZ: thickness / 2,
  });
  const turn = new Quaternion().setFromUnitVectors(UP, span.normalize());
  return geometry.applyMatrix4(new Matrix4().compose(start, turn, new Vector3(1, 1, 1)));
}
