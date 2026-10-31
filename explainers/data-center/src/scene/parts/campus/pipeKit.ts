import { CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { Extent } from '@core/scene/regions';
import type { Point } from '../../../ids';
import type { BoxSpec } from '../../../model';
import { ROOF_Y, spanning } from '../../../model';
import type { Finish } from '../../finishes';
import { boxMatrix, instancesOf } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { ROOF_GIRDER, ROOF_GIRDER_TOP_Y, ROOF_GIRDER_X } from './constants';
import { materialOf, unitCube } from './kit';

export type Span = readonly [number, number, number, number, number, number];
export type Look = Finish | MaterialFinish;
export type Tagged = readonly [Finish, Span];
export type Draw = ReturnType<typeof drawer>;

const ROD_SIDES = 16;
const DUNNAGE_HALF_M = 0.1;
const UP = new Vector3(0, 1, 0);
const rodGeometries = new WeakMap<PartContext, CylinderGeometry>();

export const SIDES = [-1, 1] as const;
export const PIPE_R = 0.15;
export const DUNNAGE_TOP_Y = ROOF_Y - 0.02;

export function spread(count: number, from = 0, to = 1): number[] {
  return Array.from({ length: count }, (_, index) => from + ((index + 0.5) * (to - from)) / count);
}

function range(centre: number, from: number, to: number): Extent {
  return [centre + Math.min(from, to), centre + Math.max(from, to)];
}

export function at([x, y, z]: Point, [x0, x1, y0, y1, z0, z1]: Span): BoxSpec {
  return spanning(range(x, x0, x1), range(y, y0, y1), range(z, z0, z1));
}

export function mirror(
  span: Span,
  xs: readonly number[] = [1],
  zs: readonly number[] = [1],
): Span[] {
  const [x0, x1, y0, y1, z0, z1] = span;
  return xs.flatMap((sx) => zs.map((sz): Span => [sx * x0, sx * x1, y0, y1, sz * z0, sz * z1]));
}

export function rod(from: Point | Vector3, to: Point | Vector3, radius: number): Matrix4 {
  const start = from instanceof Vector3 ? from.clone() : new Vector3(...from);
  const axis = (to instanceof Vector3 ? to.clone() : new Vector3(...to)).sub(start);
  const length = axis.length();
  return new Matrix4().compose(
    start.addScaledVector(axis, 0.5),
    new Quaternion().setFromUnitVectors(UP, axis.normalize()),
    new Vector3(radius, length, radius),
  );
}

export function dunnage(fromX: number, toX: number, z: number): BoxSpec {
  const west = Math.max(...ROOF_GIRDER_X.filter((x) => x <= fromX)) - ROOF_GIRDER.width / 2;
  const east = Math.min(...ROOF_GIRDER_X.filter((x) => x > toX)) + ROOF_GIRDER.width / 2;
  return at(
    [0, 0, z],
    [west, east, ROOF_GIRDER_TOP_Y, DUNNAGE_TOP_Y, -DUNNAGE_HALF_M, DUNNAGE_HALF_M],
  );
}

export function drawer(context: PartContext, group: EmphasisGroup, parent: Object3D) {
  const look = (finish: Look) => materialOf(context, group, finish);
  const mesh = (geometry: BufferGeometry, material: Material, matrices: readonly Matrix4[]) => {
    const instanced = instancesOf(context, geometry, material, matrices);
    parent.add(instanced);
    return instanced;
  };
  const boxes = (finish: Look, specs: readonly BoxSpec[]) =>
    mesh(
      unitCube(context),
      look(finish),
      specs.map((spec) => boxMatrix(spec)),
    );
  const rods = (finish: Look, matrices: readonly Matrix4[]) => {
    const geometry = rodGeometries.get(context) ?? new CylinderGeometry(1, 1, 1, ROD_SIDES);
    rodGeometries.set(context, geometry);
    return mesh(geometry, look(finish), matrices);
  };
  const table = (bases: readonly Point[], rows: readonly Tagged[]) =>
    new Set(rows.map(([finish]) => finish)).forEach((finish) => {
      const spans = rows.filter(([own]) => own === finish).map(([, span]) => span);
      boxes(
        finish,
        bases.flatMap((base) => spans.map((span) => at(base, span))),
      );
    });
  return { context, group, look, mesh, boxes, rods, table };
}
