import { BufferAttribute, BufferGeometry, Vector3 } from 'three';

export type RingPoint = readonly [x: number, y: number, z: number];
export type Ring = readonly RingPoint[];

export interface StitchOptions {
  capStart?: boolean;
  capEnd?: boolean;
  along?: readonly number[];
  around?: readonly number[];
  open?: boolean;
}

const XYZ = 3;
const UV = 2;
const TRIANGLE = 3;

interface Builder {
  positions: number[];
  uvs: number[];
  indices: number[];
}

function centroid(ring: Ring): RingPoint {
  const sum = ring.reduce<[number, number, number]>(
    (total, point) => [total[0] + point[0], total[1] + point[1], total[2] + point[2]],
    [0, 0, 0],
  );
  return [sum[0] / ring.length, sum[1] / ring.length, sum[2] / ring.length];
}

function addVertex(builder: Builder, point: RingPoint, u: number, v: number): number {
  builder.positions.push(point[0], point[1], point[2]);
  builder.uvs.push(u, v);
  return builder.positions.length / XYZ - 1;
}

function rowLength(rings: readonly Ring[], open: boolean): number {
  return open ? rings[0].length : rings[0].length + 1;
}

function addSides(builder: Builder, rings: readonly Ring[], options: StitchOptions): void {
  const count = rings[0].length;
  const row = rowLength(rings, options.open ?? false);
  const span = row - 1;
  rings.forEach((ring, index) => {
    const u = options.along?.[index] ?? index / (rings.length - 1);
    for (let around = 0; around < row; around += 1) {
      const v = options.around?.[around] ?? around / span;
      addVertex(builder, ring[around % count], u, v);
    }
  });
  for (let index = 0; index < rings.length - 1; index += 1) {
    for (let around = 0; around < span; around += 1) {
      const a = index * row + around;
      const b = a + row;
      builder.indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
}

function polygonNormal(ring: Ring, centre: RingPoint): Vector3 {
  const middle = new Vector3(...centre);
  const normal = new Vector3();
  ring.forEach((point, index) => {
    const next = ring[(index + 1) % ring.length];
    const a = new Vector3(...point).sub(middle);
    const b = new Vector3(...next).sub(middle);
    normal.add(a.cross(b));
  });
  return normal;
}

function addCap(builder: Builder, ring: Ring, neighbour: Ring, u: number): void {
  const middle = centroid(ring);
  const away = new Vector3(...middle).sub(new Vector3(...centroid(neighbour)));
  const forward = polygonNormal(ring, middle).dot(away) >= 0;
  const centre = addVertex(builder, middle, u, 0.5);
  const first = builder.positions.length / XYZ;
  ring.forEach((point, index) => addVertex(builder, point, u, index / ring.length));
  for (let index = 0; index < ring.length; index += 1) {
    const a = first + index;
    const b = first + ((index + 1) % ring.length);
    if (forward) builder.indices.push(centre, a, b);
    else builder.indices.push(centre, b, a);
  }
}

function sideOrientation(builder: Builder, rings: readonly Ring[], open: boolean): number {
  const { positions, indices } = builder;
  const row = rowLength(rings, open);
  const sideTriangles = (rings.length - 1) * (row - 1) * 2;
  const vertex = (index: number) => new Vector3().fromArray(positions, index * XYZ);
  let sum = 0;
  for (let triangle = 0; triangle < sideTriangles; triangle += 1) {
    const [a, b, c] = [0, 1, 2].map((offset) => vertex(indices[triangle * TRIANGLE + offset]));
    const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    const ring = rings[Math.floor(indices[triangle * TRIANGLE] / row)];
    const middle = new Vector3(...centroid(ring));
    sum += normal.dot(a.add(b).add(c).divideScalar(TRIANGLE).sub(middle));
  }
  return sum;
}

function flipTriangles(indices: number[]): void {
  for (let index = 0; index < indices.length; index += TRIANGLE) {
    const second = indices[index + 1];
    indices[index + 1] = indices[index + 2];
    indices[index + 2] = second;
  }
}

function weldSeamNormals(geometry: BufferGeometry, rings: number, count: number): void {
  const normal = geometry.getAttribute('normal');
  const row = count + 1;
  const sum = new Vector3();
  for (let index = 0; index < rings; index += 1) {
    const first = index * row;
    const last = first + count;
    sum.fromBufferAttribute(normal, first).add(new Vector3().fromBufferAttribute(normal, last));
    sum.normalize();
    normal.setXYZ(first, sum.x, sum.y, sum.z);
    normal.setXYZ(last, sum.x, sum.y, sum.z);
  }
  normal.needsUpdate = true;
}

export function stitchRings(rings: readonly Ring[], options: StitchOptions = {}): BufferGeometry {
  if (rings.length < 2) throw new Error('A surface needs at least two rings');
  const builder: Builder = { positions: [], uvs: [], indices: [] };
  const open = options.open ?? false;
  addSides(builder, rings, options);
  if (sideOrientation(builder, rings, open) < 0) flipTriangles(builder.indices);
  const last = rings.length - 1;
  if (options.capStart) addCap(builder, rings[0], rings[1], 0);
  if (options.capEnd) addCap(builder, rings[last], rings[last - 1], 1);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(builder.positions), XYZ));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(builder.uvs), UV));
  geometry.setIndex(builder.indices);
  geometry.computeVertexNormals();
  if (!open) weldSeamNormals(geometry, rings.length, rings[0].length);
  return geometry;
}
