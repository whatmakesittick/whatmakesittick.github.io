import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import type { Vec3 } from './solids';

const a = new Vector3();
const b = new Vector3();
const c = new Vector3();
const normal = new Vector3();

export class FacetBuilder {
  private readonly positions: number[] = [];

  triangle(first: Vec3, second: Vec3, third: Vec3, facing: Vec3): this {
    a.set(...first);
    b.set(...second);
    c.set(...third);
    normal.subVectors(b, a).cross(c.clone().sub(a));
    const flipped = normal.dot(new Vector3(...facing)) < 0;
    const ordered = flipped ? [first, third, second] : [first, second, third];
    ordered.forEach((point) => this.positions.push(...point));
    return this;
  }

  quad(first: Vec3, second: Vec3, third: Vec3, fourth: Vec3, facing: Vec3): this {
    return this.triangle(first, second, third, facing).triangle(first, third, fourth, facing);
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }
}
