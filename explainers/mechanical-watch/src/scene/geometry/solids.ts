import { BoxGeometry, CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import type { Span } from '../../model/scale';
import { extrudeOutline, latheZ } from './extrude';
import type { LathePoint } from './extrude';
import type { Circle, Vec2 } from './outline';
import { circlePoints } from './outline';

export type Vec3 = readonly [x: number, y: number, z: number];

export interface ArborForm {
  readonly span: Span;
  readonly radius: number;
  readonly pivotRadius: number;
  readonly pivotLength: number;
}

const UP = new Vector3(0, 1, 0);

export function disc(circle: Circle, span: Span, segments: number): BufferGeometry {
  const geometry = new CylinderGeometry(circle.r, circle.r, span[1] - span[0], segments);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(circle.x, circle.y, (span[0] + span[1]) / 2);
  return geometry;
}

export function ring(
  centre: Vec2,
  inner: number,
  outer: number,
  span: Span,
  segments: number,
): BufferGeometry {
  const outline = circlePoints({ ...centre, r: outer }, segments);
  const hole = circlePoints({ ...centre, r: inner }, segments);
  return extrudeOutline(outline, span[0], span[1], [hole]);
}

function arborProfile(form: ArborForm): LathePoint[] {
  const [bottom, top] = form.span;
  const { radius, pivotRadius, pivotLength } = form;
  const shoulder = radius - pivotRadius;
  return [
    [0, bottom],
    [pivotRadius, bottom],
    [pivotRadius, bottom + pivotLength],
    [radius, bottom + pivotLength + shoulder],
    [radius, top - pivotLength - shoulder],
    [pivotRadius, top - pivotLength],
    [pivotRadius, top],
    [0, top],
  ];
}

export function arbor(form: ArborForm, segments: number): BufferGeometry {
  return latheZ(arborProfile(form), segments);
}

export function rod(from: Vec3, to: Vec3, radius: number, segments: number): BufferGeometry {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const direction = end.clone().sub(start);
  const geometry = new CylinderGeometry(radius, radius, direction.length(), segments);
  const turn = new Quaternion().setFromUnitVectors(UP, direction.normalize());
  const middle = start.add(end).multiplyScalar(1 / 2);
  return geometry.applyMatrix4(new Matrix4().compose(middle, turn, new Vector3(1, 1, 1)));
}

export function block(centre: Vec3, size: Vec3, angle = 0): BufferGeometry {
  const geometry = new BoxGeometry(...size);
  geometry.rotateZ(angle);
  geometry.translate(...centre);
  return geometry;
}
