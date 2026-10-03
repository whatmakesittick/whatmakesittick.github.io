import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

export type Vec3 = readonly [x: number, y: number, z: number];
export type Uv = readonly [u: number, v: number];

export interface GridOptions {
  uv?: (row: number, column: number) => Uv;
  keep?: (row: number, column: number) => boolean;
}

const XYZ = 3;
const TRIANGLE = 3;

export function gridSurface(rows: readonly (readonly Vec3[])[], options: GridOptions = {}) {
  const columns = rows[0].length;
  const positions: number[] = [];
  const uvs: number[] = [];
  rows.forEach((row, r) =>
    row.forEach((point, c) => {
      positions.push(point[0], point[1], point[2]);
      const uv = options.uv?.(r, c) ?? [c / (columns - 1), r / (rows.length - 1)];
      uvs.push(uv[0], uv[1]);
    }),
  );
  const indices: number[] = [];
  for (let r = 0; r < rows.length - 1; r += 1) {
    for (let c = 0; c < columns - 1; c += 1) {
      if (options.keep && !options.keep(r, c)) continue;
      const a = r * columns + c;
      const b = a + columns;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function flipWinding(geometry: BufferGeometry): BufferGeometry {
  const index = geometry.getIndex();
  if (index) {
    const array = index.array;
    for (let at = 0; at < array.length; at += TRIANGLE) {
      const second = array[at + 1];
      array[at + 1] = array[at + 2];
      array[at + 2] = second;
    }
    index.needsUpdate = true;
  }
  geometry.computeVertexNormals();
  return geometry;
}

function facing(geometry: BufferGeometry, reference: Vector3): number {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;
  const vertex = (at: number) =>
    new Vector3().fromBufferAttribute(position, index ? index.getX(at) : at);
  let sum = 0;
  for (let at = 0; at < count; at += TRIANGLE) {
    const a = vertex(at);
    const b = vertex(at + 1);
    const c = vertex(at + 2);
    const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    const middle = a.add(b).add(c).divideScalar(TRIANGLE).sub(reference);
    sum += normal.dot(middle);
  }
  return sum;
}

export function orientFrom(
  geometry: BufferGeometry,
  reference: Vec3,
  outward = true,
): BufferGeometry {
  const sum = facing(geometry, new Vector3(...reference));
  if (outward ? sum < 0 : sum > 0) flipWinding(geometry);
  return geometry;
}

export function mirrorZ(geometry: BufferGeometry): BufferGeometry {
  const mirrored = geometry.clone();
  mirrored.scale(1, 1, -1);
  return flipWinding(mirrored);
}

export function polygonFan(points: readonly Vec3[], uv?: (point: Vec3) => Uv): BufferGeometry {
  const positions = points.flatMap((point) => [...point]);
  const uvs = points.flatMap((point) => [...(uv?.(point) ?? [0, 0])]);
  const indices: number[] = [];
  for (let at = 1; at < points.length - 1; at += 1) indices.push(0, at, at + 1);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
