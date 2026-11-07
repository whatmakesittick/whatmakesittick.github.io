import { CylinderGeometry } from 'three';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import type { Point } from '../../../ids';
import { keyX } from '../../../model';
import { FINISHES } from '../../finishes';
import { partMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import {
  QUARTER_TURN,
  mergeParts,
  profileAlongX,
  rectShape,
  segmentMatrix,
} from '../keyboard/geometry';

export type Span = readonly [number, number];
export type Planar = readonly [y: number, z: number];

const ROD_SIDES = 8;

export function keyCentred([x, y, z]: Point, key: number): Point {
  return [x - keyX(key), y, z];
}

export function slab(z: Span, y: Span, halfWidth: number, round = 0, x = 0): BufferGeometry {
  return profileAlongX(rectShape({ a: z, b: y }, round), x - halfWidth, x + halfWidth);
}

export function rod(from: Point, to: Point, radius: number): BufferGeometry {
  const unit = new CylinderGeometry(1, 1, 1, ROD_SIDES).rotateX(QUARTER_TURN);
  return unit.applyMatrix4(segmentMatrix(from, to, radius));
}

export function planarRod(from: Planar, to: Planar, radius: number, x = 0): BufferGeometry {
  return rod([x, ...from], [x, ...to], radius);
}

export function ghostMesh(
  context: PartContext,
  group: EmphasisGroup,
  parent: Object3D,
  parts: readonly BufferGeometry[],
): Mesh {
  const mesh = partMesh(context, mergeParts(parts), group, FINISHES.ghost);
  parent.add(mesh);
  return mesh;
}

export function turnAbout([y, z]: Planar, [pivotY, pivotZ]: Planar, angle: number): Planar {
  const dy = y - pivotY;
  const dz = z - pivotZ;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [pivotY + dy * cos - dz * sin, pivotZ + dy * sin + dz * cos];
}
