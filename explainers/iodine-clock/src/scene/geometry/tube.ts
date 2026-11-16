import { BufferAttribute, BufferGeometry, Vector3 } from 'three';

const XYZ = 3;
const UV = 2;
const QUAD = 6;

export class DynamicTube {
  readonly geometry = new BufferGeometry();
  private readonly positions: Float32Array;
  private readonly normals: Float32Array;
  private readonly rings: number;
  private readonly sides: number;
  private readonly tangent = new Vector3();
  private readonly side = new Vector3();
  private readonly up = new Vector3();
  private readonly reference = new Vector3(0, 0, 1);
  private readonly direction = new Vector3();

  constructor(rings: number, sides: number) {
    this.rings = rings;
    this.sides = sides;
    const vertices = (rings + 1) * (sides + 1);
    this.positions = new Float32Array(vertices * XYZ);
    this.normals = new Float32Array(vertices * XYZ);
    const uvs = new Float32Array(vertices * UV);
    const indices: number[] = [];
    for (let ring = 0; ring <= rings; ring += 1) {
      for (let around = 0; around <= sides; around += 1) {
        const vertex = ring * (sides + 1) + around;
        uvs[vertex * UV] = around / sides;
        uvs[vertex * UV + 1] = ring / rings;
        if (ring < rings && around < sides) {
          const next = vertex + sides + 1;
          indices.push(vertex, next, vertex + 1, vertex + 1, next, next + 1);
        }
      }
    }
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, XYZ));
    this.geometry.setAttribute('normal', new BufferAttribute(this.normals, XYZ));
    this.geometry.setAttribute('uv', new BufferAttribute(uvs, UV));
    this.geometry.setIndex(indices);
    this.geometry.setDrawRange(0, rings * sides * QUAD);
  }

  update(path: readonly Vector3[], radii: readonly number[]): void {
    for (let ring = 0; ring <= this.rings; ring += 1) {
      const centre = path[ring];
      const before = path[Math.max(0, ring - 1)];
      const after = path[Math.min(this.rings, ring + 1)];
      this.tangent.subVectors(after, before).normalize();
      this.side.crossVectors(this.tangent, this.reference).normalize();
      this.up.crossVectors(this.side, this.tangent).normalize();
      for (let around = 0; around <= this.sides; around += 1) {
        const angle = (around / this.sides) * Math.PI * 2;
        this.direction
          .copy(this.side)
          .multiplyScalar(Math.cos(angle))
          .addScaledVector(this.up, Math.sin(angle));
        const offset = (ring * (this.sides + 1) + around) * XYZ;
        this.normals[offset] = this.direction.x;
        this.normals[offset + 1] = this.direction.y;
        this.normals[offset + 2] = this.direction.z;
        this.positions[offset] = centre.x + this.direction.x * radii[ring];
        this.positions[offset + 1] = centre.y + this.direction.y * radii[ring];
        this.positions[offset + 2] = centre.z + this.direction.z * radii[ring];
      }
    }
    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('normal').needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  dispose(): void {
    this.geometry.dispose();
  }
}
