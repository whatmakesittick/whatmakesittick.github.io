import { CylinderGeometry, LatheGeometry, Material, Matrix4 } from 'three';
import { PlaneGeometry, Quaternion, Vector2, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { FULL_TURN, lerp } from '@core/math';
import type { Point } from '../../../ids';
import type { Finish } from '../../finishes';
import { instancesOf, placement } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { materialOf, unitCube } from './kit';

export type Cuboid = readonly [x: number, y: number, z: number, w: number, h: number, d: number];
type Shape = 'box' | 'bar' | 'round' | 'insulator' | 'panel';
type Look = Finish | MaterialFinish | Material;
export type Adder = (look: Look, shape: Shape, matrices: readonly Matrix4[]) => InstancedMesh;

const UP = new Vector3(0, 1, 0);
const ACROSS = new Vector3(1, 0, 0);
const ROUND_SIDES = 8;
const BAR = { radius: Math.SQRT1_2, sides: 4 } as const;
const INSULATOR_SIDES = 6;
const CORNER_U = [1, -1, -1, 1];
const CORNER_V = [1, 1, -1, -1];
const MEMBER = { width: 0.065, leg: 1.8 };
const SHED = { count: 4, cap: 0.3, radius: [0.24, 0.5, 0.5, 0.24], rise: [0.2, 0.3, 0.42, 0.85] };

export function cuboid([x, y, z, w, h, d]: Cuboid): Matrix4 {
  return placement([x, y + h / 2, z], [w, h, d]);
}

export function upright(x: number, y: number, z: number, width: number, height: number): Matrix4 {
  return placement([x, y, z], [width, height, width]);
}

export function strut(from: Point, to: Point, width: number): Matrix4 {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const turn = new Quaternion().setFromUnitVectors(UP, direction.clone().normalize());
  const size = new Vector3(width, direction.length(), width);
  return new Matrix4().compose(start.addScaledVector(direction, 0.5), turn, size);
}

export function polyline(points: readonly Point[], width: number): Matrix4[] {
  return points.slice(1).map((point, index) => strut(points[index], point, width));
}

export function lattice(from: Point, to: Point, width: readonly number[], panels: number) {
  const [start, end] = [new Vector3(...from), new Vector3(...to)];
  const normal = end.clone().sub(start).normalize().cross(ACROSS);
  const corner = (level: number, index: number): Point => {
    const half = lerp(width[0], width[1], level / panels) / 2;
    const at = start.clone().lerp(end, level / panels);
    at.addScaledVector(ACROSS, CORNER_U[index % 4] * half);
    return at.addScaledVector(normal, CORNER_V[index % 4] * half).toArray();
  };
  const member = (from: Point, to: Point) => strut(from, to, MEMBER.width);
  const levels = Array.from({ length: panels + 1 }, (_, level) => level);
  return CORNER_U.flatMap((_, index) => [
    strut(corner(0, index), corner(panels, index), MEMBER.width * MEMBER.leg),
    ...levels.map((level) => member(corner(level, index), corner(level, index + 1))),
    ...levels.slice(1).map((level) => {
      const flip = level % 2;
      return member(corner(level - 1, index + flip), corner(level, index + 1 - flip));
    }),
  ]);
}

function insulatorProfile(): Vector2[] {
  const sheds = Array.from({ length: SHED.count }, (_, shed) =>
    SHED.radius.map((radius, step) => new Vector2(radius, (shed + SHED.rise[step]) / SHED.count)),
  );
  const end = (y: number) => [new Vector2(0, y), new Vector2(SHED.cap, y)];
  return [...end(0), ...sheds.flat(), ...end(1).reverse()];
}

const shapes = new WeakMap<PartContext, Record<Shape, BufferGeometry>>();

function shapeOf(context: PartContext, shape: Shape): BufferGeometry {
  const found = shapes.get(context) ?? {
    box: unitCube(context),
    bar: new CylinderGeometry(BAR.radius, BAR.radius, 1, BAR.sides, 1, true).rotateY(FULL_TURN / 8),
    round: new CylinderGeometry(0.5, 0.5, 1, ROUND_SIDES),
    insulator: new LatheGeometry(insulatorProfile(), INSULATOR_SIDES),
    panel: new PlaneGeometry(),
  };
  shapes.set(context, found);
  return found[shape];
}

export function adder(context: PartContext, group: EmphasisGroup, parent: Object3D): Adder {
  return (look, shape, matrices) => {
    const material = look instanceof Material ? look : materialOf(context, group, look);
    const mesh = instancesOf(context, shapeOf(context, shape), material, matrices);
    parent.add(mesh);
    return mesh;
  };
}
