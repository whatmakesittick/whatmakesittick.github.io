import type { Triple } from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';
import type { Model } from './topology.ts';
import { vertexNormals } from './topology.ts';
import { point, type Vec } from './vec.ts';

const INFLATE = 0.003;
const SMOOTH_PASSES = 3;
const SMOOTH_FACTOR = 0.5;
const RIM_RINGS = 3;
const STRAP_POINTS = 24;
const STRAP_OFFSET = 0.003;
const STRAP_BACK_DROP = 0.03;
const STRAP_BAND = 0.012;
const STRAP_LATERAL = 0.015;

function neighbours(triangles: readonly number[], inside: Set<number>): Map<number, Set<number>> {
  const result = new Map<number, Set<number>>();
  for (let i = 0; i < triangles.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const [a, b] = [triangles[i + k], triangles[i + ((k + 1) % 3)]];
      if (!inside.has(a) || !inside.has(b)) continue;
      if (!result.has(a)) result.set(a, new Set());
      if (!result.has(b)) result.set(b, new Set());
      result.get(a)!.add(b);
      result.get(b)!.add(a);
    }
  }
  return result;
}

function rimDistance(capTriangles: number[], rim: Set<number>): Map<number, number> {
  const graph = neighbours(capTriangles, new Set(capTriangles));
  const distance = new Map<number, number>([...rim].map((v) => [v, 0]));
  let frontier = [...rim];
  while (frontier.length > 0) {
    const nextFrontier: number[] = [];
    for (const v of frontier) {
      for (const n of graph.get(v) ?? []) {
        if (distance.has(n)) continue;
        distance.set(n, distance.get(v)! + 1);
        nextFrontier.push(n);
      }
    }
    frontier = nextFrontier;
  }
  return distance;
}

export function shapeCap(model: Model, capTriangles: number[], rim: Set<number>): void {
  const distance = rimDistance(capTriangles, rim);
  const graph = neighbours(capTriangles, new Set(capTriangles));
  const normals = vertexNormals(model.positions, model.triangles);
  const free = [...distance.keys()].filter((v) => !rim.has(v));
  for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
    const moved = free.map((v) => {
      const around = [...graph.get(v)!].map((n) => point(model.positions, n));
      const mean = [0, 1, 2].map((k) => around.reduce((sum, p) => sum + p[k], 0) / around.length);
      const current = point(model.positions, v);
      const blended = current.map((c, k) => c + (mean[k] - c) * SMOOTH_FACTOR) as Vec;
      return current[2] === 0 ? [blended[0], blended[1], 0] : blended;
    });
    free.forEach((v, i) => model.positions.set(moved[i], v * 3));
  }
  for (const v of free) {
    const ramp = Math.min(1, distance.get(v)! / RIM_RINGS);
    const lift = INFLATE * ramp * ramp * (3 - 2 * ramp);
    const normal = point(normals, v);
    const axes = model.positions[v * 3 + 2] === 0 ? 2 : 3;
    for (let k = 0; k < axes; k++) model.positions[v * 3 + k] += normal[k] * lift;
  }
}

export function strapLoop(
  headVertices: number[],
  positions: ArrayLike<number>,
  eyeX: number,
): Triple[] {
  const loop: Triple[] = [];
  for (let i = 0; i < STRAP_POINTS; i++) {
    const angle = (i / STRAP_POINTS) * 2 * Math.PI;
    const height = eyeX - STRAP_BACK_DROP * (1 - Math.cos(angle)) * 0.5;
    const band = headVertices
      .map((v) => point(positions, v))
      .filter((p) => Math.abs(p[0] - height) < STRAP_BAND);
    const ys = band.map((p) => p[1]);
    const centreY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const direction: [number, number] = [-Math.cos(angle), Math.sin(angle)];
    const reachDirection: [number, number] = [direction[0], Math.abs(direction[1])];
    const reach = band.reduce(
      (best, p) => Math.max(best, rayReach([p[1] - centreY, p[2]], reachDirection)),
      0,
    );
    const distance = reach + STRAP_OFFSET;
    loop.push([height, centreY + direction[0] * distance, direction[1] * distance]);
  }
  return loop;
}

function rayReach(offset: [number, number], direction: [number, number]): number {
  const along = offset[0] * direction[0] + offset[1] * direction[1];
  const across = Math.abs(offset[0] * direction[1] - offset[1] * direction[0]);
  return across < STRAP_LATERAL ? along : 0;
}
