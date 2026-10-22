import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Vec3 } from './nose';

const XYZ = 3;

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]);
  return length > 0 ? [v[0] / length, v[1] / length, v[2] / length] : [0, 0, 0];
}

export function mirrorZ(v: Vec3): Vec3 {
  return [v[0], v[1], -v[2]];
}

export class MeshBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly indices: number[] = [];
  private readonly keys = new Map<string | undefined, number>();

  vertex(position: Vec3, normal: Vec3, key?: string): number {
    const known = this.keys.get(key);
    if (known !== undefined) return known;
    const index = this.positions.length / XYZ;
    this.positions.push(...position);
    this.normals.push(...normal);
    if (key !== undefined) this.keys.set(key, index);
    return index;
  }

  triangle(a: number, b: number, c: number): void {
    this.indices.push(a, b, c);
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
    geometry.setIndex(this.indices);
    return geometry;
  }
}

export class RegionBuilders<R extends string> {
  private readonly builders = new Map<R, MeshBuilder>();

  of(region: R): MeshBuilder {
    if (!this.builders.has(region)) this.builders.set(region, new MeshBuilder());
    return this.builders.get(region) as MeshBuilder;
  }

  build(): Map<R, BufferGeometry> {
    return new Map([...this.builders].map(([region, builder]) => [region, builder.build()]));
  }
}
