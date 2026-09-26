import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

export interface SurfaceVertex {
  position: Vector3;
  normal: Vector3;
}

const XYZ = 3;
const edgeA = new Vector3();
const edgeB = new Vector3();

export class MeshBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly indices: number[] = [];

  private vertex({ position, normal }: SurfaceVertex): number {
    this.positions.push(position.x, position.y, position.z);
    this.normals.push(normal.x, normal.y, normal.z);
    return this.positions.length / XYZ - 1;
  }

  grid(
    rows: number,
    columns: number,
    vertexAt: (row: number, column: number) => SurfaceVertex,
  ): void {
    const first = this.positions.length / XYZ;
    const cells: SurfaceVertex[][] = [];
    for (let row = 0; row < rows; row++) {
      cells.push([]);
      for (let column = 0; column < columns; column++) {
        const vertex = vertexAt(row, column);
        cells[row].push(vertex);
        this.vertex(vertex);
      }
    }
    const flip = this.isInverted(cells);
    const index = (row: number, column: number) => first + row * columns + column;
    for (let row = 0; row < rows - 1; row++) {
      for (let column = 0; column < columns - 1; column++) {
        const a = index(row, column);
        const b = index(row + 1, column);
        const c = index(row + 1, column + 1);
        const d = index(row, column + 1);
        if (flip) this.indices.push(a, d, b, b, d, c);
        else this.indices.push(a, b, d, b, c, d);
      }
    }
  }

  private isInverted(cells: SurfaceVertex[][]): boolean {
    const origin = cells[0][0];
    edgeA.subVectors(cells[1][0].position, origin.position);
    edgeB.subVectors(cells[0][1].position, origin.position);
    return edgeA.cross(edgeB).dot(origin.normal) < 0;
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, XYZ));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, XYZ));
    geometry.setIndex(this.indices);
    return geometry;
  }
}
