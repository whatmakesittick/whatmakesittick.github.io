import type { BufferGeometry } from 'three';
import { BoxGeometry, Matrix4, Vector3 } from 'three';
import type { Vec3 } from './mesh';

export type Basis = readonly [along: Vec3, up: Vec3, across: Vec3];

export function orientedBox(centre: Vec3, basis: Basis, size: Vec3): BufferGeometry {
  const geometry = new BoxGeometry(...size);
  return placed(geometry, centre, basis);
}

export function placed(geometry: BufferGeometry, centre: Vec3, basis: Basis): BufferGeometry {
  const [along, up, across] = basis.map((axis) => new Vector3(...axis));
  const matrix = new Matrix4().makeBasis(along, up, across).setPosition(...centre);
  return geometry.applyMatrix4(matrix);
}

export function signedArea(points: readonly (readonly [number, number])[]): number {
  return (
    points.reduce((sum, [a, b], index) => {
      const [c, d] = points[(index + 1) % points.length];
      return sum + a * d - c * b;
    }, 0) / 2
  );
}
