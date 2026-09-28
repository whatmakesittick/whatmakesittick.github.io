import { BoxGeometry, CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

export type Point = readonly [x: number, y: number, z: number];

const DEFAULT_SEGMENTS = 8;
const UP = new Vector3(0, 1, 0);
const start = new Vector3();
const end = new Vector3();
const middle = new Vector3();
const direction = new Vector3();
const size = new Vector3();
const turn = new Quaternion();

export function barMatrix(
  from: Point,
  to: Point,
  width: number,
  target: Matrix4,
  depth = width,
): Matrix4 {
  start.set(...from);
  end.set(...to);
  direction.subVectors(end, start);
  const length = direction.length();
  turn.setFromUnitVectors(UP, direction.normalize());
  middle.addVectors(start, end).multiplyScalar(1 / 2);
  size.set(width, length, depth);
  return target.compose(middle, turn, size);
}

export function unitBox(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}

export function barGeometry(from: Point, to: Point, width: number, depth = width): BufferGeometry {
  return unitBox().applyMatrix4(barMatrix(from, to, width, new Matrix4(), depth));
}

export function rodGeometry(
  from: Point,
  to: Point,
  radius: number,
  segments = DEFAULT_SEGMENTS,
): BufferGeometry {
  const rod = new CylinderGeometry(1 / 2, 1 / 2, 1, segments);
  return rod.applyMatrix4(barMatrix(from, to, radius * 2, new Matrix4()));
}

export function unitRod(segments = DEFAULT_SEGMENTS): BufferGeometry {
  return new CylinderGeometry(1 / 2, 1 / 2, 1, segments);
}
