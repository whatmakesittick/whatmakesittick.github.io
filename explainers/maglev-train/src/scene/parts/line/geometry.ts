import {
  BufferAttribute,
  CylinderGeometry,
  ExtrudeGeometry,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box } from '@core/scene/geometry/box';

export type ProfilePoint = readonly [z: number, y: number];

const QUARTER_TURN = Math.PI / 2;
const CURVE_SEGMENTS = 8;
const UV = 2;
const UP = new Vector3(0, 1, 0);

export function profileShape(points: readonly ProfilePoint[]): Shape {
  return new Shape(points.map(([z, y]) => new Vector2(z, y)));
}

export function mirrored(rightHalf: readonly ProfilePoint[]): ProfilePoint[] {
  const left = rightHalf
    .filter(([z]) => z !== 0)
    .map(([z, y]): ProfilePoint => [-z, y])
    .reverse();
  return [...rightHalf, ...left];
}

export function sideProfile(points: readonly ProfilePoint[], side: number): ProfilePoint[] {
  const placed = points.map(([z, y]): ProfilePoint => [z * side, y]);
  return side < 0 ? placed.reverse() : placed;
}

export function extrudeAlongX(
  shape: Shape,
  start: number,
  end: number,
  chamfer = 0,
): BufferGeometry {
  const bevel = chamfer > 0;
  const geometry = new ExtrudeGeometry(shape, {
    depth: end - start - 2 * chamfer,
    bevelEnabled: bevel,
    bevelThickness: chamfer,
    bevelSize: chamfer,
    bevelOffset: -chamfer,
    bevelSegments: 1,
    curveSegments: CURVE_SEGMENTS,
  });
  geometry.rotateY(-QUARTER_TURN);
  geometry.translate(end - chamfer, 0, 0);
  return geometry;
}

export function boxOver(
  [minX, maxX]: readonly [number, number],
  [minY, maxY]: readonly [number, number],
  [minZ, maxZ]: readonly [number, number],
): BufferGeometry {
  return box({ minX, maxX, minY, maxY, minZ, maxZ });
}

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

export function repeatAlongX(
  make: (x: number) => BufferGeometry,
  positions: readonly number[],
): BufferGeometry {
  return mergeParts(positions.map(make));
}

export function boxProjectUVs(geometry: BufferGeometry, metresPerRepeat: number): BufferGeometry {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = new Float32Array(position.count * UV);
  for (let index = 0; index < position.count; index += 1) {
    const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
    const [nx, ny, nz] = [normal.getX(index), normal.getY(index), normal.getZ(index)].map(Math.abs);
    const [u, v] = ny >= nx && ny >= nz ? [x, z] : nx >= nz ? [z, y] : [x, y];
    uv[index * UV] = u / metresPerRepeat;
    uv[index * UV + 1] = v / metresPerRepeat;
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, UV));
  return geometry;
}

export function evenlySpaced(count: number, from: number, to: number): number[] {
  const step = (to - from) / count;
  return Array.from({ length: count }, (_, index) => from + step * (index + 0.5));
}

export function extrudeAlongZ(shape: Shape, start: number, end: number): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: end - start,
    bevelEnabled: false,
    curveSegments: CURVE_SEGMENTS,
  });
  geometry.translate(0, 0, start);
  return geometry;
}

export function sideShape(points: readonly (readonly [number, number])[]): Shape {
  return new Shape(points.map(([a, b]) => new Vector2(a, b)));
}

export function cylinderBetween(
  from: Vector3,
  to: Vector3,
  [startRadius, endRadius]: readonly [number, number],
  segments: number,
): BufferGeometry {
  const axis = new Vector3().subVectors(to, from);
  const geometry = new CylinderGeometry(endRadius, startRadius, axis.length(), segments, 1, true);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, axis.normalize()));
  geometry.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
  return geometry;
}
