import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Vec3 } from './nose';

const AREA_EPSILON = 1e-14;

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
  private readonly keys = new Map<string, number>();

  get empty(): boolean {
    return this.indices.length === 0;
  }

  vertex(position: Vec3, normal: Vec3, key?: string): number {
    const known = key === undefined ? undefined : this.keys.get(key);
    if (known !== undefined) return known;
    const index = this.positions.length / 3;
    this.positions.push(...position);
    this.normals.push(...normal);
    if (key !== undefined) this.keys.set(key, index);
    return index;
  }

  triangle(a: number, b: number, c: number): void {
    const corner = (index: number): Vec3 => [
      this.positions[index * 3],
      this.positions[index * 3 + 1],
      this.positions[index * 3 + 2],
    ];
    const normal = cross(sub(corner(b), corner(a)), sub(corner(c), corner(a)));
    if (dot(normal, normal) < AREA_EPSILON) return;
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
    let builder = this.builders.get(region);
    if (!builder) {
      builder = new MeshBuilder();
      this.builders.set(region, builder);
    }
    return builder;
  }

  build(): Map<R, BufferGeometry> {
    const built = new Map<R, BufferGeometry>();
    this.builders.forEach((builder, region) => {
      if (!builder.empty) built.set(region, builder.build());
    });
    return built;
  }
}
