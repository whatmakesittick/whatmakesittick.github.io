import {
  BoxGeometry,
  CurvePath,
  LineCurve3,
  CylinderGeometry,
  Quaternion,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { latheAlongX } from '@core/scene/geometry/lathe';
import { bentPath } from '../kit';
import type { LatheArc } from '@core/scene/geometry/lathe';
import type { Point } from '../../../ids';

export type Side = 'front' | 'back';

export const AXIS_X = new Vector3(1, 0, 0);
export const AXIS_Y = new Vector3(0, 1, 0);
export const AXIS_Z = new Vector3(0, 0, 1);

const MIN_SIDES = 8;
const MAX_SIDES = 24;
const SIDES_PER_METRE = 60;
const HALF_TURN = Math.PI;
const ROUND_SEGMENTS = 1;
const SEGMENTS_PER_RADIAN_METRE = 6;
const MIN_SEGMENTS = 6;
const TUBE_SEGMENTS_PER_METRE = 4;
const TUBE_SIDES = 8;
const PROFILE_CIRCLE_POINTS = 6;
const BEND_SEGMENTS = 6;

const HALF_START: Record<Side, number> = { front: -HALF_TURN / 2, back: HALF_TURN / 2 };

export function sidesFor(radius: number): number {
  return Math.min(MAX_SIDES, Math.max(MIN_SIDES, Math.ceil(radius * SIDES_PER_METRE)));
}

function segmentsFor(profile: readonly Vector2[], arc: LatheArc): number {
  const widest = Math.max(...profile.map((point) => point.x));
  return Math.max(MIN_SEGMENTS, Math.ceil(widest * arc.length * SEGMENTS_PER_RADIAN_METRE));
}

export function halfArc(side: Side, trim = 0): LatheArc {
  return { start: HALF_START[side] + trim, length: HALF_TURN - trim * 2 };
}

export function vec(point: Point): Vector3 {
  return new Vector3(...point);
}

export function oriented(
  geometry: BufferGeometry,
  position: Point,
  direction: Vector3 = AXIS_Y,
): BufferGeometry {
  const rotation = new Quaternion().setFromUnitVectors(AXIS_Y, direction.clone().normalize());
  geometry.applyQuaternion(rotation);
  geometry.translate(...position);
  return geometry;
}

export function block(centre: Point, size: Point): BufferGeometry {
  return new BoxGeometry(...size).translate(...centre);
}

export function span(min: Point, max: Point): BufferGeometry {
  const centre = min.map((value, index) => (value + max[index]) / 2) as unknown as Point;
  const size = min.map((value, index) => max[index] - value) as unknown as Point;
  return block(centre, size);
}

export function roundedBlock(centre: Point, size: Point, radius: number): BufferGeometry {
  return new RoundedBoxGeometry(...size, ROUND_SEGMENTS, radius).translate(...centre);
}

export function disc(
  position: Point,
  direction: Vector3,
  radius: number,
  thickness: number,
  sides = sidesFor(radius),
): BufferGeometry {
  return oriented(new CylinderGeometry(radius, radius, thickness, sides), position, direction);
}

export function washer(
  position: Point,
  direction: Vector3,
  inner: number,
  outer: number,
  thickness: number,
): BufferGeometry {
  const geometry = latheAlongX(
    ringProfile(inner, outer, 0, thickness),
    segmentsFor([new Vector2(outer, 0)], FULL_ARC),
  ).rotateZ(HALF_TURN / 2);
  return oriented(geometry, position, direction);
}

export function rod(
  from: Point,
  to: Point,
  radius: number,
  sides = sidesFor(radius),
): BufferGeometry {
  const axis = vec(to).sub(vec(from));
  const middle = vec(from).add(vec(to)).multiplyScalar(0.5);
  const geometry = new CylinderGeometry(radius, radius, axis.length(), sides);
  return oriented(geometry, [middle.x, middle.y, middle.z], axis);
}

export function bar(from: Point, to: Point, width: number, depth = width): BufferGeometry {
  const axis = vec(to).sub(vec(from));
  const middle = vec(from).add(vec(to)).multiplyScalar(0.5);
  const geometry = new BoxGeometry(width, axis.length(), depth);
  return oriented(geometry, [middle.x, middle.y, middle.z], axis);
}

export function halfRod(
  from: Point,
  to: Point,
  radius: number,
  side: Side,
  sides = sidesFor(radius),
): BufferGeometry {
  const axis = vec(to).sub(vec(from));
  const middle = vec(from).add(vec(to)).multiplyScalar(0.5);
  const geometry = new CylinderGeometry(
    radius,
    radius,
    axis.length(),
    sides,
    1,
    true,
    HALF_START[side],
    HALF_TURN,
  );
  return oriented(geometry, [middle.x, middle.y, middle.z], axis);
}

export function polyTube(points: readonly Point[], radius: number): BufferGeometry {
  const path = new CurvePath<Vector3>();
  points.slice(1).forEach((point, index) => {
    path.add(new LineCurve3(vec(points[index]), vec(point)));
  });
  const segments = Math.max(2, Math.ceil(path.getLength() * TUBE_SEGMENTS_PER_METRE));
  return new TubeGeometry(path, segments + points.length, radius, TUBE_SIDES, false);
}

const FULL_ARC: LatheArc = { start: 0, length: HALF_TURN * 2 };

export function ringProfile(inner: number, outer: number, x: number, thickness: number): Vector2[] {
  const half = thickness / 2;
  return [
    new Vector2(inner, x - half),
    new Vector2(outer, x - half),
    new Vector2(outer, x + half),
    new Vector2(inner, x + half),
    new Vector2(inner, x - half),
  ];
}

export function profileTube(
  profile: readonly Vector2[],
  arc: LatheArc = FULL_ARC,
  lift = 0,
): BufferGeometry {
  return latheAlongX([...profile], segmentsFor(profile, arc), arc).translate(0, lift, 0);
}

export function ringAlongX(
  x: number,
  radius: number,
  tube: number,
  arc: LatheArc = FULL_ARC,
  lift = 0,
): BufferGeometry {
  const profile = Array.from({ length: PROFILE_CIRCLE_POINTS + 1 }, (_, index) => {
    const angle = (index / PROFILE_CIRCLE_POINTS) * HALF_TURN * 2;
    return new Vector2(radius + Math.cos(angle) * tube, x + Math.sin(angle) * tube);
  });
  return profileTube(profile, arc, lift);
}

export function runPipe(
  points: readonly Point[],
  radius: number,
  bend = radius * 3,
): BufferGeometry {
  const parts = bentPath(points, bend).curves.map((curve) =>
    curve instanceof LineCurve3
      ? rod(
          [curve.v1.x, curve.v1.y, curve.v1.z],
          [curve.v2.x, curve.v2.y, curve.v2.z],
          radius,
          TUBE_SIDES,
        )
      : new TubeGeometry(curve, BEND_SEGMENTS, radius, TUBE_SIDES, false),
  );
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('Pipe parts cannot be merged');
  return merged;
}
