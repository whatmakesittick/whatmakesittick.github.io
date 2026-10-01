import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';

export function triangles(geometry: BufferGeometry): Vector3[][] {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = source.getAttribute('position');
  const result: Vector3[][] = [];
  for (let first = 0; first < position.count; first += 3) {
    result.push(
      [0, 1, 2].map((offset) => new Vector3().fromBufferAttribute(position, first + offset)),
    );
  }
  return result;
}

export function facing([a, b, c]: readonly Vector3[]): Vector3 {
  return new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).multiplyScalar(0.5);
}

export function zRange(geometry: BufferGeometry): [number, number] {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  return bounds ? [bounds.min.z, bounds.max.z] : [0, 0];
}
