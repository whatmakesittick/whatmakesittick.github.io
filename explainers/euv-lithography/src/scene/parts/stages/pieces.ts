import { BoxGeometry, CylinderGeometry } from 'three';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Point } from '../../../ids';
import type { Finish } from '../../finishes';
import { mesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

const ROUND_SEGMENTS = 2;
const ROD_SIDES = 14;

export type Axis = 'x' | 'y' | 'z';

export interface Piece {
  finish: Finish;
  geometry: BufferGeometry;
}

export function slab(finish: Finish, at: Point, size: Point, radius = 0): Piece {
  const geometry =
    radius > 0 ? new RoundedBoxGeometry(...size, ROUND_SEGMENTS, radius) : new BoxGeometry(...size);
  return { finish, geometry: geometry.translate(...at) };
}

export function rod(finish: Finish, at: Point, radius: number, length: number, axis: Axis): Piece {
  const geometry = new CylinderGeometry(radius, radius, length, ROD_SIDES);
  if (axis === 'x') geometry.rotateZ(Math.PI / 2);
  if (axis === 'z') geometry.rotateX(Math.PI / 2);
  return { finish, geometry: geometry.translate(...at) };
}

export function addPieces(
  context: PartContext,
  group: EmphasisGroup,
  parent: Object3D,
  pieces: readonly Piece[],
  origin: Point,
): Mesh[] {
  const finishes = [...new Set(pieces.map((piece) => piece.finish))];
  return finishes.map((finish) => {
    const parts = pieces.filter((piece) => piece.finish === finish);
    const merged = mergeGeometries(
      parts.map(({ geometry }) => (geometry.index ? geometry.toNonIndexed() : geometry)),
    );
    parts.forEach((piece) => piece.geometry.dispose());
    const target = mesh(context, merged.translate(...origin), group, finish);
    parent.add(target);
    return target;
  });
}
