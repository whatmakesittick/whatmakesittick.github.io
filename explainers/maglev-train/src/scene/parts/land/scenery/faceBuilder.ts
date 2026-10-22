import { BufferGeometry, Float32BufferAttribute } from 'three';

export type Vertex = readonly [number, number, number];
export type Rgb = readonly [number, number, number];

export class FaceBuilder {
  private readonly positions: number[] = [];
  private readonly colours: number[] = [];

  triangle(p0: Vertex, p1: Vertex, p2: Vertex, colour: Rgb): void {
    this.positions.push(...p0, ...p1, ...p2);
    this.colours.push(...colour, ...colour, ...colour);
  }

  quad(p0: Vertex, p1: Vertex, p2: Vertex, p3: Vertex, colour: Rgb): void {
    this.triangle(p0, p1, p2, colour);
    this.triangle(p0, p2, p3, colour);
  }

  geometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colours, 3));
    geometry.computeVertexNormals();
    return geometry;
  }
}

export function painted(geometry: BufferGeometry, colour: Rgb): BufferGeometry {
  const count = geometry.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) colours.set(colour, index * 3);
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return geometry;
}
