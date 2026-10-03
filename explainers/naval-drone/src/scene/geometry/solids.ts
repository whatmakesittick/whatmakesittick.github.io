import { BoxGeometry, CylinderGeometry, LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import type { Vec3 } from './surface';

export type Axis = 'x' | 'y' | 'z';
type Span = readonly [number, number];

const QUARTER_TURN = Math.PI / 2;
const ROD_SEGMENTS = 12;

const middle = ([from, to]: Span) => (from + to) / 2;

export function boxAt(size: Vec3, centre: Vec3, turn = 0): BufferGeometry {
  return new BoxGeometry(...size).rotateY(turn).translate(...centre);
}

export function boxBetween(x: Span, y: Span, z: Span): BufferGeometry {
  return boxAt([x[1] - x[0], y[1] - y[0], z[1] - z[0]], [middle(x), middle(y), middle(z)]);
}

export function rod(
  axis: Axis,
  radius: number,
  length: number,
  at: Vec3,
  segments = ROD_SEGMENTS,
): BufferGeometry {
  const piece = new CylinderGeometry(radius, radius, length, segments);
  if (axis === 'x') piece.rotateZ(QUARTER_TURN);
  if (axis === 'z') piece.rotateX(QUARTER_TURN);
  return piece.translate(...at);
}

export function lathe(points: readonly (readonly [number, number])[], segments: number) {
  return new LatheGeometry(
    points.map(([radius, height]) => new Vector2(radius, height)),
    segments,
  );
}
