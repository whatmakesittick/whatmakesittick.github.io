import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Matrix4,
  Path,
  Quaternion,
  Shape,
  Vector3,
} from 'three';
import type { BufferGeometry, InstancedMesh, Mesh, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Point } from '../../../ids';
import type { Finish } from '../../finishes';
import { mesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { boltHead, facing, instanced, placement, vector, washerAlongX } from '../kit';
import { BEVEL_M, BOLT_M } from './dims';

export type Axis = 'x' | 'y' | 'z';
export type Cell = [number, number, number];

const ROD_SIDES = 8;
const BEVEL_SEGMENTS = 1;
const CURVE_SEGMENTS = 24;
const AXIS_INDEX: Record<Axis, number> = { x: 0, y: 1, z: 2 };
const BASES: Record<Axis, readonly [Point, Point, Point]> = {
  x: [
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 0],
  ],
  y: [
    [1, 0, 0],
    [0, 0, -1],
    [0, 1, 0],
  ],
  z: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
};
const PLANE: Record<Axis, (point: Point) => [number, number]> = {
  x: (point) => [point[1], point[2]],
  y: (point) => [point[0], -point[2]],
  z: (point) => [point[0], point[1]],
};
const BOLT_DIRECTION: Record<Axis, Vector3> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
};

export type Hole =
  | { readonly min: Point; readonly max: Point }
  | { readonly centre: Point; readonly radius: number };

export class Bin {
  private readonly parts = new Map<Finish, BufferGeometry[]>();

  add(finish: Finish, ...geometries: BufferGeometry[]): this {
    const list = this.parts.get(finish) ?? [];
    geometries.forEach((geometry) =>
      list.push(geometry.index ? geometry.toNonIndexed() : geometry),
    );
    this.parts.set(finish, list);
    return this;
  }

  build(context: PartContext, group: EmphasisGroup, parent: Object3D): Mesh[] {
    return [...this.parts].map(([finish, list]) => {
      const merged = mergeGeometries(list);
      if (!merged) throw new Error(`Cannot merge ${finish}`);
      const target = mesh(context, merged, group, finish);
      parent.add(target);
      return target;
    });
  }
}

export function joined(geometries: readonly BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(geometries.map((g) => (g.index ? g.toNonIndexed() : g)));
  if (!merged) throw new Error('Cannot merge geometries');
  return merged;
}

export function slab(min: Point, max: Point, radius = 0): BufferGeometry {
  const size = max.map((value, index) => value - min[index]) as unknown as Point;
  const centre = max.map((value, index) => (value + min[index]) / 2) as unknown as Point;
  const round = Math.min(radius, Math.min(...size) / 2.5);
  const geometry =
    round > 0 ? new RoundedBoxGeometry(...size, BEVEL_SEGMENTS, round) : new BoxGeometry(...size);
  return geometry.translate(...centre);
}

export function bevelled(min: Point, max: Point): BufferGeometry {
  return slab(min, max, BEVEL_M);
}

export function rod(
  from: Point,
  to: Point,
  radius: number,
  radiusTo = radius,
  sides = ROD_SIDES,
): BufferGeometry {
  const start = vector(from);
  const direction = vector(to).sub(start);
  const geometry = new CylinderGeometry(radiusTo, radius, direction.length(), sides);
  geometry.applyQuaternion(facing(direction));
  return geometry.translate(...start.addScaledVector(direction, 0.5).toArray());
}

export function ring(
  axis: Axis,
  centre: Point,
  inner: number,
  outer: number,
  thickness: number,
): BufferGeometry {
  const geometry = washerAlongX(inner, outer, thickness);
  if (axis === 'y') geometry.rotateZ(Math.PI / 2);
  if (axis === 'z') geometry.rotateY(-Math.PI / 2);
  return geometry.translate(...centre);
}

function holePath(axis: Axis, hole: Hole): Path {
  const path = new Path();
  const project = PLANE[axis];
  if ('radius' in hole) {
    const [u, v] = project(hole.centre);
    return path.absarc(u, v, hole.radius, 0, Math.PI * 2, true);
  }
  const [u0, v0] = project(hole.min);
  const [u1, v1] = project(hole.max);
  const [uLow, uHigh] = [Math.min(u0, u1), Math.max(u0, u1)];
  const [vLow, vHigh] = [Math.min(v0, v1), Math.max(v0, v1)];
  path.moveTo(uLow, vLow).lineTo(uHigh, vLow).lineTo(uHigh, vHigh).lineTo(uLow, vHigh);
  return path.closePath();
}

export function plate(axis: Axis, min: Point, max: Point, hole?: Hole): BufferGeometry {
  const [u0, v0] = PLANE[axis](min);
  const [u1, v1] = PLANE[axis](max);
  const shape = new Shape();
  shape
    .moveTo(Math.min(u0, u1), Math.min(v0, v1))
    .lineTo(Math.max(u0, u1), Math.min(v0, v1))
    .lineTo(Math.max(u0, u1), Math.max(v0, v1))
    .lineTo(Math.min(u0, u1), Math.max(v0, v1));
  if (hole) shape.holes.push(holePath(axis, hole));
  const index = AXIS_INDEX[axis];
  const geometry = new ExtrudeGeometry(shape, {
    depth: max[index] - min[index],
    bevelEnabled: false,
    curveSegments: CURVE_SEGMENTS,
  });
  const [u, v, w] = BASES[axis].map(vector);
  geometry.applyMatrix4(new Matrix4().makeBasis(u, v, w));
  const offset: Cell = [0, 0, 0];
  offset[index] = min[index];
  return geometry.translate(...offset);
}

export function circlePoints(
  axis: Axis,
  centre: Point,
  radius: number,
  count: number,
  offset = 0,
): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = offset + (index / count) * Math.PI * 2;
    const [a, b] = [Math.cos(angle) * radius, Math.sin(angle) * radius];
    if (axis === 'x') return [centre[0], centre[1] + a, centre[2] + b];
    if (axis === 'y') return [centre[0] + a, centre[1], centre[2] + b];
    return [centre[0] + a, centre[1] + b, centre[2]];
  });
}

export function bolts(
  context: PartContext,
  group: EmphasisGroup,
  axis: Axis,
  points: readonly Point[],
  size = BOLT_M,
): InstancedMesh {
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), BOLT_DIRECTION[axis]);
  const matrices = points.map((point) => placement(point, [1, 1, 1], rotation));
  return instanced(context, boltHead(size), group, 'bolt', matrices);
}
