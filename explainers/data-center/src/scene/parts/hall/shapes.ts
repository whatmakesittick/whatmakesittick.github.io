import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  TubeGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Extent } from '@core/scene/regions';
import type { Point } from '../../../ids';
import { spanning } from '../../../model';
import type { BoxSpec, Facing, RowSpec } from '../../../model';
import { boxMatrix, placement } from '../context';

const UP = new Vector3(0, 1, 0);
const PIPE_SEGMENTS = 10;
const TUBE_SEGMENTS = 4;
const TUBE_SIDES = 4;
const BOX_FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const;

export type BoxFace = (typeof BOX_FACES)[number];

export function along(centre: number, size: number): Extent {
  return [centre - size / 2, centre + size / 2];
}

export function openBox(skip: readonly BoxFace[], geometry = new BoxGeometry()): BufferGeometry {
  const index = geometry.getIndex();
  if (!index) return geometry;
  const kept = geometry.groups
    .filter((_, face) => !skip.includes(BOX_FACES[face]))
    .flatMap(({ start, count }) => Array.from(index.array.slice(start, start + count)));
  geometry.setIndex(kept);
  geometry.clearGroups();
  return geometry;
}

export function boxAt(
  x: Extent,
  y: Extent,
  z: Extent,
  skip: readonly BoxFace[] = [],
): BufferGeometry {
  const geometry = openBox(skip, new BoxGeometry(x[1] - x[0], y[1] - y[0], z[1] - z[0]));
  geometry.translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
  return geometry;
}

export function panelAt(x: Extent, y: Extent, z: number, normal: Facing): BufferGeometry {
  const geometry = new PlaneGeometry(x[1] - x[0], y[1] - y[0]);
  if (normal < 0) geometry.rotateY(Math.PI);
  geometry.translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, z);
  return geometry;
}

export function frontPlane(): BufferGeometry {
  return new PlaneGeometry().rotateY(Math.PI);
}

export function rodGeometry(sides = PIPE_SEGMENTS, openEnded = false): BufferGeometry {
  return new CylinderGeometry(1, 1, 1, sides, 1, openEnded);
}

export function rodBetween(from: Point, to: Point, radius: number): Matrix4 {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const length = direction.length();
  const rotation = new Quaternion().setFromUnitVectors(UP, direction.normalize());
  const centre = start.addScaledVector(direction, length / 2);
  return new Matrix4().compose(centre, rotation, new Vector3(radius, length, radius));
}

export function rodGeometryBetween(from: Point, to: Point, radius: number, sides = 6) {
  return rodGeometry(sides, true).applyMatrix4(rodBetween(from, to, radius));
}

export function ribbonBetween(from: Point, to: Point, width: number): BufferGeometry {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const length = direction.length();
  const across = direction.normalize().multiplyScalar(direction.x < 0 ? -1 : 1);
  const normal = new Vector3().crossVectors(across, UP);
  const centre = start.addScaledVector(direction, length / 2);
  return new PlaneGeometry(length, width).applyMatrix4(
    new Matrix4().makeBasis(across, UP, normal).setPosition(centre),
  );
}

export function tubeThrough(points: readonly Point[], radius: number): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
  return new TubeGeometry(curve, TUBE_SEGMENTS, radius, TUBE_SIDES, false);
}

export function merged(geometries: BufferGeometry[], groups = false): BufferGeometry {
  const result = mergeGeometries(
    geometries.map((geometry) => (geometry.index ? geometry.toNonIndexed() : geometry)),
    groups,
  );
  geometries.forEach((geometry) => geometry.dispose());
  return result;
}

export function runMatrix(x: Extent, y: Extent, z: Extent): Matrix4 {
  return boxMatrix(spanning(x, y, z));
}

export function yawOf(facing: Facing): number {
  return facing < 0 ? 0 : Math.PI;
}

export function facingPlacement(base: Point, facing: Facing): Matrix4 {
  return placement(base, [1, 1, 1], yawOf(facing));
}

export function localPlacement(base: Point, facing: Facing, offset: Point): Matrix4 {
  return facingPlacement(base, facing).multiply(new Matrix4().makeTranslation(...offset));
}

export function rowX(row: RowSpec, length: number): Extent {
  return [row.startX, row.startX + length];
}

export function boxMatrices(boxes: readonly BoxSpec[]): Matrix4[] {
  return boxes.map((box) => boxMatrix(box));
}

export function hashed(index: number, salt = 0): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}
