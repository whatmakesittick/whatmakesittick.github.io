import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

export type Vec3 = readonly [x: number, y: number, z: number];

const scratchA = new Vector3();
const scratchB = new Vector3();
const scratchFace = new Vector3();

function faceNormal(a: Vec3, b: Vec3, c: Vec3): Vector3 {
  scratchA.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  scratchB.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  return scratchFace.crossVectors(scratchA, scratchB);
}

function agrees(face: Vector3, normal: Vec3): boolean {
  return face.x * normal[0] + face.y * normal[1] + face.z * normal[2] >= 0;
}

export class SurfaceBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];

  triangle(points: readonly [Vec3, Vec3, Vec3], normals: readonly [Vec3, Vec3, Vec3]): void {
    const [a, b, c] = points;
    const average: Vec3 = [
      normals[0][0] + normals[1][0] + normals[2][0],
      normals[0][1] + normals[1][1] + normals[2][1],
      normals[0][2] + normals[1][2] + normals[2][2],
    ];
    const order = agrees(faceNormal(a, b, c), average) ? [0, 1, 2] : [0, 2, 1];
    order.forEach((index) => {
      this.positions.push(...points[index]);
      this.normals.push(...normals[index]);
    });
  }

  quad(
    points: readonly [Vec3, Vec3, Vec3, Vec3],
    normals: readonly [Vec3, Vec3, Vec3, Vec3],
  ): void {
    this.triangle([points[0], points[1], points[2]], [normals[0], normals[1], normals[2]]);
    this.triangle([points[0], points[2], points[3]], [normals[0], normals[2], normals[3]]);
  }

  flatQuad(points: readonly [Vec3, Vec3, Vec3, Vec3], normal: Vec3): void {
    this.quad(points, [normal, normal, normal, normal]);
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }
}
