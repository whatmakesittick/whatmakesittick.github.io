import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Mesh, Vector3 } from 'three';
import type { Material } from 'three';
import type { PathBuffer } from './pathBuffer';

const XYZ = 3;
const TRIANGLE_CORNERS_PER_QUAD = 6;
const DEGENERATE_LENGTH = 1e-6;
const MIN_MITER_COSINE = 0.6;
const TURNED_BACK = 1e-3;
const PARALLEL_LIMIT = 0.9;
const UP = new Vector3(0, 1, 0);
const SIDEWAYS = new Vector3(1, 0, 0);

function quadIndices(capacity: number, sides: number): number[] {
  const indices: number[] = [];
  for (let ring = 0; ring < capacity - 1; ring++) {
    for (let side = 0; side < sides; side++) {
      const next = (side + 1) % sides;
      const a = ring * sides + side;
      const b = ring * sides + next;
      const c = (ring + 1) * sides + side;
      const d = (ring + 1) * sides + next;
      indices.push(a, c, b, b, c, d);
    }
  }
  return indices;
}

export class ThreadTube {
  readonly mesh: Mesh<BufferGeometry, Material>;
  private readonly sides: number;
  private readonly capacity: number;
  private readonly positions: Float32Array;
  private readonly normals: Float32Array;
  private readonly directions: Float32Array;
  private readonly cosines: Float32Array;
  private readonly sines: Float32Array;
  private readonly tangent = new Vector3();
  private readonly normal = new Vector3();
  private readonly binormal = new Vector3();
  private readonly incoming = new Vector3();
  private readonly outgoing = new Vector3();
  private readonly spoke = new Vector3();

  constructor(capacity: number, sides: number, material: Material) {
    this.capacity = capacity;
    this.sides = sides;
    this.positions = new Float32Array(capacity * sides * XYZ);
    this.normals = new Float32Array(capacity * sides * XYZ);
    this.directions = new Float32Array(capacity * XYZ);
    this.cosines = Float32Array.from({ length: sides }, (_, side) =>
      Math.cos((2 * Math.PI * side) / sides),
    );
    this.sines = Float32Array.from({ length: sides }, (_, side) =>
      Math.sin((2 * Math.PI * side) / sides),
    );
    const geometry = new BufferGeometry();
    geometry.setIndex(quadIndices(capacity, sides));
    geometry.setAttribute(
      'position',
      new BufferAttribute(this.positions, XYZ).setUsage(DynamicDrawUsage),
    );
    geometry.setAttribute(
      'normal',
      new BufferAttribute(this.normals, XYZ).setUsage(DynamicDrawUsage),
    );
    geometry.setDrawRange(0, 0);
    this.mesh = new Mesh(geometry, material);
    this.mesh.frustumCulled = false;
  }

  update(path: PathBuffer): void {
    const count = Math.min(path.count, this.capacity);
    const geometry = this.mesh.geometry;
    if (count < 2) {
      geometry.setDrawRange(0, 0);
      return;
    }
    this.computeDirections(path, count);
    this.resetNormal();
    for (let index = 0; index < count; index++) this.writeRing(path, index, count);
    geometry.setDrawRange(0, (count - 1) * this.sides * TRIANGLE_CORNERS_PER_QUAD);
    geometry.getAttribute('position').needsUpdate = true;
    geometry.getAttribute('normal').needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }

  private computeDirections(path: PathBuffer, count: number): void {
    let firstValid = -1;
    for (let index = 0; index < count - 1; index++) {
      const dx = path.x(index + 1) - path.x(index);
      const dy = path.y(index + 1) - path.y(index);
      const dz = path.z(index + 1) - path.z(index);
      const length = Math.hypot(dx, dy, dz);
      if (length > DEGENERATE_LENGTH) {
        this.setDirection(index, dx / length, dy / length, dz / length);
        if (firstValid < 0) firstValid = index;
      } else if (firstValid >= 0) {
        this.copyDirection(index, index - 1);
      }
    }
    this.fillLeadingDirections(firstValid);
  }

  private fillLeadingDirections(firstValid: number): void {
    if (firstValid < 0) {
      this.setDirection(0, UP.x, UP.y, UP.z);
      return;
    }
    for (let index = 0; index < firstValid; index++) this.copyDirection(index, firstValid);
  }

  private setDirection(index: number, x: number, y: number, z: number): void {
    const offset = index * XYZ;
    this.directions[offset] = x;
    this.directions[offset + 1] = y;
    this.directions[offset + 2] = z;
  }

  private copyDirection(target: number, source: number): void {
    this.directions.copyWithin(target * XYZ, source * XYZ, source * XYZ + XYZ);
  }

  private direction(index: number, target: Vector3): Vector3 {
    return target.fromArray(this.directions, index * XYZ);
  }

  private resetNormal(): void {
    this.direction(0, this.tangent);
    this.normal.crossVectors(this.tangent, this.referenceAxis()).normalize();
  }

  private writeRing(path: PathBuffer, index: number, count: number): void {
    const last = count - 2;
    this.direction(Math.max(0, index - 1), this.incoming);
    this.direction(Math.min(index, last), this.outgoing);
    this.tangent.addVectors(this.incoming, this.outgoing);
    if (this.tangent.lengthSq() < TURNED_BACK) this.tangent.copy(this.outgoing);
    this.tangent.normalize();
    this.transportNormal();
    const miter = 1 / Math.max(MIN_MITER_COSINE, this.tangent.dot(this.outgoing));
    const radius = path.radius(index) * miter;
    const base = index * this.sides * XYZ;
    for (let side = 0; side < this.sides; side++) {
      this.spoke
        .copy(this.normal)
        .multiplyScalar(this.cosines[side])
        .addScaledVector(this.binormal, this.sines[side]);
      const offset = base + side * XYZ;
      this.normals[offset] = this.spoke.x;
      this.normals[offset + 1] = this.spoke.y;
      this.normals[offset + 2] = this.spoke.z;
      this.positions[offset] = path.x(index) + this.spoke.x * radius;
      this.positions[offset + 1] = path.y(index) + this.spoke.y * radius;
      this.positions[offset + 2] = path.z(index) + this.spoke.z * radius;
    }
  }

  private referenceAxis(): Vector3 {
    return Math.abs(this.tangent.y) < PARALLEL_LIMIT ? UP : SIDEWAYS;
  }

  private transportNormal(): void {
    this.normal.addScaledVector(this.tangent, -this.normal.dot(this.tangent));
    if (this.normal.lengthSq() < DEGENERATE_LENGTH) {
      this.normal.crossVectors(this.tangent, this.referenceAxis());
    }
    this.normal.normalize();
    this.binormal.crossVectors(this.tangent, this.normal);
  }
}
