import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import type { Vector2 } from 'three';

export interface Vertex {
  position: Vector3;
  normal: Vector3;
  uv: Vector2;
}

const edgeA = new Vector3();
const edgeB = new Vector3();
const facing = new Vector3();

export class MeshBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly uvs: number[] = [];

  triangle(a: Vertex, b: Vertex, c: Vertex): void {
    edgeA.subVectors(b.position, a.position);
    edgeB.subVectors(c.position, a.position);
    facing.copy(a.normal).add(b.normal).add(c.normal);
    const ordered = edgeA.cross(edgeB).dot(facing) >= 0 ? [a, b, c] : [a, c, b];
    ordered.forEach((vertex) => {
      this.positions.push(vertex.position.x, vertex.position.y, vertex.position.z);
      this.normals.push(vertex.normal.x, vertex.normal.y, vertex.normal.z);
      this.uvs.push(vertex.uv.x, vertex.uv.y);
    });
  }

  quad(a: Vertex, b: Vertex, c: Vertex, d: Vertex): void {
    this.triangle(a, b, c);
    this.triangle(c, b, d);
  }

  get triangleCount(): number {
    return this.positions.length / 9;
  }

  toGeometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(this.uvs, 2));
    geometry.computeBoundingSphere();
    return geometry;
  }
}
