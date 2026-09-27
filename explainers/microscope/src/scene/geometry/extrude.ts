import { ExtrudeGeometry, Shape, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { HALF_TURN, QUARTER_TURN } from '../../turns';

export type PlanePoint = readonly [a: number, b: number];

const CURVE_SEGMENTS = 6;

function extrude(shape: Shape, depth: number): ExtrudeGeometry {
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: CURVE_SEGMENTS });
}

export function outlineShape(points: readonly PlanePoint[]): Shape {
  return new Shape(points.map(([a, b]) => new Vector2(a, b)));
}

export function extrudeUpward(plan: Shape, bottom: number, top: number): BufferGeometry {
  const geometry = extrude(plan, top - bottom);
  geometry.rotateX(QUARTER_TURN);
  geometry.translate(0, top, 0);
  return geometry;
}

export function extrudeAcrossX(profile: Shape, halfWidth: number): BufferGeometry {
  const geometry = extrude(profile, 2 * halfWidth);
  geometry.rotateY(-QUARTER_TURN);
  geometry.translate(halfWidth, 0, 0);
  return geometry;
}

export function roundedRectangle(
  [minA, minB]: PlanePoint,
  [maxA, maxB]: PlanePoint,
  radius: number,
): Shape {
  const shape = new Shape();
  shape.moveTo(minA + radius, minB);
  shape.lineTo(maxA - radius, minB);
  shape.absarc(maxA - radius, minB + radius, radius, -QUARTER_TURN, 0, false);
  shape.lineTo(maxA, maxB - radius);
  shape.absarc(maxA - radius, maxB - radius, radius, 0, QUARTER_TURN, false);
  shape.lineTo(minA + radius, maxB);
  shape.absarc(minA + radius, maxB - radius, radius, QUARTER_TURN, HALF_TURN, false);
  shape.lineTo(minA, minB + radius);
  shape.absarc(minA + radius, minB + radius, radius, HALF_TURN, HALF_TURN + QUARTER_TURN, false);
  return shape;
}
