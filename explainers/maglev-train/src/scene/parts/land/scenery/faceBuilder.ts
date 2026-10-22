import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

export type Vertex = readonly [number, number, number];
export type Rgb = readonly [number, number, number];

const a = new Vector3();
const b = new Vector3();
const c = new Vector3();

export class FaceBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colours: number[] = [];

  triangle(p0: Vertex, p1: Vertex, p2: Vertex, colour: Rgb): void {
    a.set(...p0);
    b.set(...p1).sub(a);
    c.set(...p2).sub(a);
    const normal = b.cross(c).normalize();
    [p0, p1, p2].forEach((point) => {
      this.positions.push(...point);
      this.normals.push(normal.x, normal.y, normal.z);
      this.colours.push(...colour);
    });
  }

  quad(p0: Vertex, p1: Vertex, p2: Vertex, p3: Vertex, colour: Rgb): void {
    this.triangle(p0, p1, p2, colour);
    this.triangle(p0, p2, p3, colour);
  }

  geometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colours, 3));
    return geometry;
  }
}
