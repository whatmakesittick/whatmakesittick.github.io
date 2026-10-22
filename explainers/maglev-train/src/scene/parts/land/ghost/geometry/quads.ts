import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Color, Vector3Tuple } from 'three';
import type { BoxBounds } from '@core/scene/geometry/box';

export type Quad = readonly [Vector3Tuple, Vector3Tuple, Vector3Tuple, Vector3Tuple];

export type QuadUv = readonly [Uv, Uv, Uv, Uv];

type Uv = readonly [number, number];

export type BoxFace = 'top' | 'minX' | 'maxX';

const XYZ = 3;
const UV = 2;
const QUAD_TRIANGLES = [0, 1, 2, 0, 2, 3] as const;

function faceCorners(bounds: BoxBounds, face: BoxFace): Quad {
  const { minX: x0, maxX: x1, minY: y0, maxY: y1, minZ: z0, maxZ: z1 } = bounds;
  const corners: Record<BoxFace, Quad> = {
    top: [
      [x0, y1, z1],
      [x1, y1, z1],
      [x1, y1, z0],
      [x0, y1, z0],
    ],
    maxX: [
      [x1, y0, z1],
      [x1, y0, z0],
      [x1, y1, z0],
      [x1, y1, z1],
    ],
    minX: [
      [x0, y0, z0],
      [x0, y0, z1],
      [x0, y1, z1],
      [x0, y1, z0],
    ],
  };
  return corners[face];
}

export class QuadSink {
  private readonly positions: number[] = [];
  private readonly colours: number[] = [];
  private readonly uvs: number[] = [];

  add(quad: Quad, tones: readonly Color[], uvs?: QuadUv): void {
    QUAD_TRIANGLES.forEach((corner) => {
      this.positions.push(...quad[corner]);
      const tone = tones[corner % tones.length];
      this.colours.push(tone.r, tone.g, tone.b);
      if (uvs) this.uvs.push(...uvs[corner]);
    });
  }

  addBox(bounds: BoxBounds, faces: readonly BoxFace[], tone: Color): void {
    faces.forEach((face) => this.add(faceCorners(bounds, face), [tone]));
  }

  geometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, XYZ));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colours, XYZ));
    if (this.uvs.length > 0) geometry.setAttribute('uv', new Float32BufferAttribute(this.uvs, UV));
    geometry.computeVertexNormals();
    return geometry;
  }
}
