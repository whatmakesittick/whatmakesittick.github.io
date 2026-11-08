import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2, Vector3 } from 'three';
import type { PlanPoint } from '@core/scene/geometry/extrude';
import type { Ring } from '../../geometry/section';
import { isInside } from '../../geometry/section';
import { add, leftOf, sub, unit } from './planMath';

export interface SlabSpec {
  readonly ring: Ring;
  readonly inner: readonly PlanPoint[];
  readonly top: (point: PlanPoint) => number;
  readonly bottom: (point: PlanPoint) => number;
  readonly uv: (point: PlanPoint) => readonly [u: number, v: number];
}

const XYZ = 3;
const OUTWARD_PROBE = 0.001;

function vector({ x, z }: PlanPoint): Vector2 {
  return new Vector2(x, z);
}

function facesUp(a: PlanPoint, b: PlanPoint, c: PlanPoint): boolean {
  return (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z) > 0;
}

function outwardOf(ring: Ring, a: PlanPoint, b: PlanPoint): PlanPoint {
  const side = leftOf(unit(sub(b, a)));
  const middle = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  return isInside([ring], add(middle, side, OUTWARD_PROBE)) ? { x: -side.x, z: -side.z } : side;
}

class Buffers {
  readonly positions: number[] = [];
  readonly uvs: number[] = [];
  readonly indices: number[] = [];

  get count(): number {
    return this.positions.length / XYZ;
  }

  vertex(point: PlanPoint, y: number, uv: readonly [number, number]): void {
    this.positions.push(point.x, y, point.z);
    this.uvs.push(uv[0], uv[1]);
  }

  vertexAt(index: number): Vector3 {
    return new Vector3().fromArray(this.positions, index * XYZ);
  }

  quad(first: number, outward: PlanPoint): void {
    const [a, b, c] = [first, first + 1, first + 2].map((index) => this.vertexAt(index));
    const normal = b.sub(a).cross(c.sub(a));
    const keep = normal.x * outward.x + normal.z * outward.z >= 0;
    const order = keep ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    order.forEach((corner) => this.indices.push(first + corner));
  }
}

export function slabGeometry(spec: SlabSpec): BufferGeometry {
  const { ring, inner, top, bottom, uv } = spec;
  const points = [...ring, ...inner];
  const faces = ShapeUtils.triangulateShape(
    ring.map(vector),
    inner.map((point) => [vector(point)]),
  );
  const buffers = new Buffers();
  points.forEach((point) => buffers.vertex(point, top(point), uv(point)));
  points.forEach((point) => buffers.vertex(point, bottom(point), uv(point)));
  const count = points.length;
  faces.forEach(([a, b, c]) => {
    const [i, j, k] = facesUp(points[a], points[b], points[c]) ? [a, b, c] : [a, c, b];
    buffers.indices.push(i, j, k, count + i, count + k, count + j);
  });
  ring.forEach((a, index) => {
    const b = ring[(index + 1) % ring.length];
    const first = buffers.count;
    buffers.vertex(a, top(a), uv(a));
    buffers.vertex(b, top(b), uv(b));
    buffers.vertex(b, bottom(b), uv(b));
    buffers.vertex(a, bottom(a), uv(a));
    buffers.quad(first, outwardOf(ring, a, b));
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(buffers.positions, XYZ));
  geometry.setAttribute('uv', new Float32BufferAttribute(buffers.uvs, 2));
  geometry.setIndex(buffers.indices);
  geometry.computeVertexNormals();
  return geometry;
}
