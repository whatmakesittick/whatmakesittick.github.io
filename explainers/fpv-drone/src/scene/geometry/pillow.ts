import { SphereGeometry } from 'three';
import type { BufferGeometry } from 'three';

export interface PillowShape {
  size: readonly [length: number, height: number, depth: number];
  squareness: number;
  widthSegments: number;
  heightSegments: number;
}

function squared(value: number, exponent: number): number {
  return Math.sign(value) * Math.abs(value) ** exponent;
}

export function pillowGeometry(shape: PillowShape): BufferGeometry {
  const geometry = new SphereGeometry(1, shape.widthSegments, shape.heightSegments);
  const position = geometry.getAttribute('position');
  const exponent = 1 / shape.squareness;
  const [length, height, depth] = shape.size;
  for (let index = 0; index < position.count; index += 1) {
    position.setXYZ(
      index,
      (squared(position.getX(index), exponent) * length) / 2,
      (squared(position.getY(index), exponent) * height) / 2,
      (squared(position.getZ(index), exponent) * depth) / 2,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}
