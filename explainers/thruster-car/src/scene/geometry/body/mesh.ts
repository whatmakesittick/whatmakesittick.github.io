import { BufferGeometry, Float32BufferAttribute } from 'three';

export type Vec3 = readonly [x: number, y: number, z: number];

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scale(a: Vec3, factor: number): Vec3 {
  return [a[0] * factor, a[1] * factor, a[2] * factor];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function normalize(a: Vec3, fallback: Vec3 = [0, 1, 0]): Vec3 {
  const length = Math.hypot(a[0], a[1], a[2]);
  return length > 0 ? scale(a, 1 / length) : fallback;
}

export class MeshBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly indices: number[] = [];
  private readonly lookup = new Map<number, number>();

  get triangleCount(): number {
    return this.indices.length / 3;
  }

  vertex(point: Vec3, normal: Vec3, key?: number): number {
    const known = key === undefined ? undefined : this.lookup.get(key);
    if (known !== undefined) return known;
    const index = this.positions.length / 3;
    this.positions.push(...point);
    this.normals.push(...normal);
    if (key !== undefined) this.lookup.set(key, index);
    return index;
  }

  triangle(a: number, b: number, c: number): void {
    this.indices.push(a, b, c);
  }

  quad(a: number, b: number, c: number, d: number): void {
    this.indices.push(a, b, c, a, c, d);
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
    geometry.setIndex(this.indices);
    geometry.computeBoundingSphere();
    return geometry;
  }
}
