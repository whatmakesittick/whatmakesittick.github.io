import {
  BoxGeometry,
  ExtrudeGeometry,
  Matrix4,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FULL_TURN } from '@core/math';
import type { BoxBounds } from '@core/scene/geometry/box';
import { extrudePlan } from '@core/scene/geometry/extrude';
import type { Point } from '../../../ids';

export type Outline = readonly (readonly [a: number, b: number])[];

export interface Rect {
  a: readonly [number, number];
  b: readonly [number, number];
}

export const QUARTER_TURN = FULL_TURN / 4;
const CURVE_SEGMENTS = 6;
const ALONG_Z = new Vector3(0, 0, 1);
const NO_TURN = new Quaternion();

export function outlineShape(points: Outline): Shape {
  return new Shape(points.map(([a, b]) => new Vector2(a, b)));
}

export function roundedShape(points: Outline, radius: number): Shape {
  const corners = points.map(([a, b]) => new Vector2(a, b));
  const shape = new Shape();
  corners.forEach((corner, index) => {
    const previous = corners[(index + corners.length - 1) % corners.length];
    const next = corners[(index + 1) % corners.length];
    const start = corner
      .clone()
      .lerp(previous, Math.min(0.5, radius / corner.distanceTo(previous)));
    const end = corner.clone().lerp(next, Math.min(0.5, radius / corner.distanceTo(next)));
    if (index === 0) shape.moveTo(start.x, start.y);
    else shape.lineTo(start.x, start.y);
    shape.quadraticCurveTo(corner.x, corner.y, end.x, end.y);
  });
  shape.closePath();
  return shape;
}

function bevelled(shape: Shape, thickness: number, bevel: number, curveSegments: number) {
  const geometry = new ExtrudeGeometry(shape, {
    depth: thickness - 2 * bevel,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
    curveSegments,
  });
  return geometry.translate(0, 0, bevel);
}

export function profileAlongX(
  shape: Shape,
  start: number,
  end: number,
  bevel = 0,
  curveSegments = CURVE_SEGMENTS,
): BufferGeometry {
  const geometry = bevelled(shape, end - start, bevel, curveSegments);
  geometry.rotateY(-QUARTER_TURN);
  return geometry.translate(end, 0, 0);
}

export function planSlab(shape: Shape, bottom: number, top: number, bevel = 0): BufferGeometry {
  if (bevel <= 0) return extrudePlan(shape, bottom, top);
  const geometry = bevelled(shape, top - bottom, bevel, CURVE_SEGMENTS);
  geometry.rotateX(QUARTER_TURN);
  return geometry.translate(0, top, 0);
}

export function capGeometry(rects: readonly Rect[]): BufferGeometry {
  return new ShapeGeometry(rects.map((rect) => rectShape(rect))).rotateY(-QUARTER_TURN);
}

export function boxBetween(bounds: BoxBounds): BufferGeometry {
  const { minX, maxX, minY, maxY, minZ, maxZ } = bounds;
  return new BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ).translate(
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
  );
}

export function mergeParts(parts: readonly BufferGeometry[]): BufferGeometry {
  const flat = parts.map((part) => {
    const plain = part.index ? part.toNonIndexed() : part;
    plain.deleteAttribute('uv');
    return plain;
  });
  return mergeGeometries(flat);
}

export function rectShape({ a, b }: Rect, radius = 0): Shape {
  const corners: Outline = [
    [a[0], b[0]],
    [a[1], b[0]],
    [a[1], b[1]],
    [a[0], b[1]],
  ];
  return radius > 0 ? roundedShape(corners, radius) : outlineShape(corners);
}

export function boxMatrix(bounds: BoxBounds): Matrix4 {
  const { minX, maxX, minY, maxY, minZ, maxZ } = bounds;
  return new Matrix4().compose(
    new Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2),
    NO_TURN,
    new Vector3(maxX - minX, maxY - minY, maxZ - minZ),
  );
}

export function segmentMatrix(from: Point, to: Point, width: number): Matrix4 {
  const start = new Vector3(...from);
  const span = new Vector3(...to).sub(start);
  const turn = new Quaternion().setFromUnitVectors(ALONG_Z, span.clone().normalize());
  const centre = start.addScaledVector(span, 0.5);
  return new Matrix4().compose(centre, turn, new Vector3(width, width, span.length()));
}

export function placedMatrix(position: Point, scale: Point = [1, 1, 1], yaw = 0): Matrix4 {
  const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
  return new Matrix4().compose(new Vector3(...position), turn, new Vector3(...scale));
}
