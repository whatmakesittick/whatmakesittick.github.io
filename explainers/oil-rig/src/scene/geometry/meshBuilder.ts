import { BufferGeometry, Float32BufferAttribute } from 'three';

const XYZ = 3;
const UV = 2;

export type Vec3 = readonly [x: number, y: number, z: number];

export class MeshBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly uvs: number[] = [];
  private readonly indices: number[] = [];

  get vertexCount(): number {
    return this.positions.length / XYZ;
  }

  get indexCount(): number {
    return this.indices.length;
  }

  vertex(position: Vec3, normal: Vec3, uv: readonly [number, number] = [0, 0]): number {
    this.positions.push(...position);
    this.normals.push(...normal);
    this.uvs.push(...uv);
    return this.vertexCount - 1;
  }

  triangle(a: number, b: number, c: number): void {
    this.indices.push(a, b, c);
  }

  quad(a: number, b: number, c: number, d: number): void {
    this.triangle(a, b, c);
    this.triangle(a, c, d);
  }

  build(withUv = false): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, XYZ));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, XYZ));
    if (withUv) geometry.setAttribute('uv', new Float32BufferAttribute(this.uvs, UV));
    geometry.setIndex(this.indices);
    return geometry;
  }
}
