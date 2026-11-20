import { INFLUENCES } from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';
import { add, cross, length, normalize, point, scale, sub, type Vec } from './vec.ts';

export interface Model {
  positions: Float64Array;
  triangles: number[];
  joints: Uint8Array;
  weights: Float32Array;
}

const HOLE_PUSH = 0.002;

export function boundaryLoops(triangles: readonly number[]): number[][] {
  const directed = new Set<string>();
  for (let i = 0; i < triangles.length; i += 3) {
    for (let k = 0; k < 3; k++) directed.add(`${triangles[i + k]},${triangles[i + ((k + 1) % 3)]}`);
  }
  const next = new Map<number, number>();
  for (const key of directed) {
    const [a, b] = key.split(',').map(Number);
    if (!directed.has(`${b},${a}`)) next.set(a, b);
  }
  const loops: number[][] = [];
  while (next.size > 0) {
    const [start] = next.keys();
    const loop = [start];
    for (let v = next.get(start)!; v !== start; v = next.get(v)!) loop.push(v);
    loop.forEach((v) => next.delete(v));
    loops.push(loop);
  }
  return loops;
}

export function vertexNormals(
  positions: ArrayLike<number>,
  triangles: readonly number[],
): Float64Array {
  const normals = new Float64Array(positions.length);
  for (let i = 0; i < triangles.length; i += 3) {
    const [a, b, c] = [triangles[i], triangles[i + 1], triangles[i + 2]].map((v) =>
      point(positions, v),
    );
    const area = cross(sub(b, a), sub(c, a));
    for (let k = 0; k < 3; k++)
      for (let j = 0; j < 3; j++) normals[triangles[i + k] * 3 + j] += area[j];
  }
  for (let v = 0; v < normals.length; v += 3) normals.set(normalize(normals.subarray(v, v + 3)), v);
  return normals;
}

function appendVertex(model: Model, position: Vec, source: number): number {
  const index = model.positions.length / 3;
  const positions = new Float64Array(model.positions.length + 3);
  positions.set(model.positions);
  positions.set(position, index * 3);
  model.positions = positions;
  const joints = new Uint8Array(model.joints.length + INFLUENCES);
  joints.set(model.joints);
  joints.set(
    model.joints.subarray(source * INFLUENCES, (source + 1) * INFLUENCES),
    index * INFLUENCES,
  );
  model.joints = joints;
  const weights = new Float32Array(model.weights.length + INFLUENCES);
  weights.set(model.weights);
  weights.set(
    model.weights.subarray(source * INFLUENCES, (source + 1) * INFLUENCES),
    index * INFLUENCES,
  );
  model.weights = weights;
  return index;
}

export function fillHoles(model: Model): number[] {
  const sizes: number[] = [];
  for (const loop of boundaryLoops(model.triangles)) {
    const normals = vertexNormals(model.positions, model.triangles);
    let centre: Vec = [0, 0, 0];
    let outward: Vec = [0, 0, 0];
    for (const v of loop) {
      centre = add(centre, point(model.positions, v));
      outward = add(outward, point(normals, v));
    }
    const pushed = sub(scale(centre, 1 / loop.length), scale(normalize(outward), HOLE_PUSH));
    const apex = appendVertex(model, pushed, loop[0]);
    loop.forEach((v, i) => model.triangles.push(loop[(i + 1) % loop.length], v, apex));
    sizes.push(loop.length);
  }
  return sizes;
}

export function triangleArea(
  positions: ArrayLike<number>,
  a: number,
  b: number,
  c: number,
): number {
  return (
    length(
      cross(
        sub(point(positions, b), point(positions, a)),
        sub(point(positions, c), point(positions, a)),
      ),
    ) / 2
  );
}
