import type { BufferGeometry } from 'three';
import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Quaternion,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const UP = new Vector3(0, 1, 0);
const SPANS_PER_POINT = 6;
const DEFAULT_RADIAL = 6;

export function spot(x: number, radius: number, fromTop: number): Vector3 {
  return new Vector3(x, radius * Math.cos(fromTop), radius * Math.sin(fromTop));
}

export function curveThrough(points: readonly Vector3[]): CatmullRomCurve3 {
  return new CatmullRomCurve3([...points], false, 'centripetal');
}

export function tubeAlong(
  through: readonly Vector3[] | CatmullRomCurve3,
  radius: number,
  radial = DEFAULT_RADIAL,
  spans = SPANS_PER_POINT,
): BufferGeometry {
  const curve = Array.isArray(through) ? curveThrough(through) : (through as CatmullRomCurve3);
  return new TubeGeometry(curve, (curve.points.length - 1) * spans, radius, radial, false);
}

export function orient(
  geometry: BufferGeometry,
  position: Vector3,
  direction: Vector3,
): BufferGeometry {
  const quaternion = new Quaternion().setFromUnitVectors(UP, direction.clone().normalize());
  geometry.applyQuaternion(quaternion);
  geometry.translate(position.x, position.y, position.z);
  return geometry;
}

export function rodBetween(
  a: Vector3,
  b: Vector3,
  radius: number,
  radial = DEFAULT_RADIAL,
): BufferGeometry {
  const direction = b.clone().sub(a);
  const geometry = new CylinderGeometry(radius, radius, direction.length(), radial, 1);
  return orient(geometry, a.clone().add(b).multiplyScalar(0.5), direction);
}

export function barBetween(a: Vector3, b: Vector3, thickness: number): BufferGeometry {
  const direction = b.clone().sub(a);
  const geometry = new BoxGeometry(thickness, direction.length(), thickness);
  return orient(geometry, a.clone().add(b).multiplyScalar(0.5), direction);
}

export function radialPiece(
  geometry: BufferGeometry,
  x: number,
  radius: number,
  fromTop: number,
): BufferGeometry {
  const at = spot(x, radius, fromTop);
  return orient(geometry, at, spot(0, 1, fromTop));
}

export function merged(parts: BufferGeometry[]): BufferGeometry {
  const geometry = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return geometry;
}

export function ringAround(
  point: Vector3,
  direction: Vector3,
  radius: number,
  tube: number,
): BufferGeometry {
  const ring = new TorusGeometry(radius, tube, 5, 10);
  ring.rotateX(Math.PI / 2);
  return orient(ring, point, direction);
}
