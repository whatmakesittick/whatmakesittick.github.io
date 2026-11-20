const CORNERS = 3;
const SNAP = 1e-7;
const MIN_AREA_SHARE = 1e-7;
const KEY_SCALE = 1e6;

type Barycentric = readonly [number, number, number];

interface Point {
  readonly bary: Barycentric;
  readonly cut: number;
}

export interface PartRange {
  readonly part: number;
  readonly start: number;
  readonly count: number;
}

export interface AddedVertices {
  readonly count: number;
  readonly sources: Uint32Array;
  readonly weights: Float32Array;
}

export interface Partition {
  readonly indices: Uint32Array;
  readonly sourceTriangles: Uint32Array;
  readonly ranges: readonly PartRange[];
  readonly added: AddedVertices;
}

interface Bucket {
  readonly indices: number[];
  readonly sources: number[];
}

interface Problem {
  readonly vertexCount: number;
  readonly weights: Float32Array;
  readonly partCount: number;
}

class Builder {
  readonly sources: number[] = [];
  readonly blends: number[] = [];
  private readonly shared = new Map<string, number>();
  private readonly problem: Problem;

  constructor(problem: Problem) {
    this.problem = problem;
  }

  resolve(point: Point, corners: readonly number[], local: Map<string, number>): number {
    const solid = [0, 1, 2].filter((i) => point.bary[i] > SNAP);
    if (solid.length === 1) return corners[solid[0]];
    if (solid.length === 2) return this.edgeVertex(point, corners, solid);
    const key = point.bary.map((b) => Math.round(b * KEY_SCALE)).join(',');
    const known = local.get(key);
    if (known !== undefined) return known;
    return this.remember(local, key, corners, point.bary);
  }

  private edgeVertex(point: Point, corners: readonly number[], solid: number[]): number {
    const [first, second] = corners[solid[0]] < corners[solid[1]] ? solid : [solid[1], solid[0]];
    const a = corners[first];
    const b = corners[second];
    const key = `${a},${b},${point.cut}`;
    const known = this.shared.get(key);
    if (known !== undefined) return known;
    const bary: [number, number, number] = [0, 0, 0];
    bary[first] = point.bary[first];
    bary[second] = point.bary[second];
    return this.remember(this.shared, key, corners, bary);
  }

  private remember(
    map: Map<string, number>,
    key: string,
    corners: readonly number[],
    bary: Barycentric,
  ): number {
    const id = this.problem.vertexCount + this.sources.length / CORNERS;
    this.sources.push(...corners);
    this.blends.push(...bary);
    map.set(key, id);
    return id;
  }
}

function cutCode(a: number, b: number, partCount: number): number {
  return Math.min(a, b) * partCount + Math.max(a, b);
}

function evaluate(bary: Barycentric, field: Barycentric): number {
  return bary[0] * field[0] + bary[1] * field[1] + bary[2] * field[2];
}

function mixPoints(a: Point, b: Point, t: number, cut: number): Point {
  const bary = a.bary.map((value, i) => value + (b.bary[i] - value) * t) as unknown as Barycentric;
  return { bary, cut };
}

function clip(polygon: Point[], field: Barycentric, cut: number): Point[] {
  const out: Point[] = [];
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const fa = evaluate(a.bary, field);
    const fb = evaluate(b.bary, field);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) out.push(mixPoints(a, b, fa / (fa - fb), cut));
  });
  return out;
}

function areaShare(a: Point, b: Point, c: Point): number {
  const ux = b.bary[1] - a.bary[1];
  const uy = b.bary[2] - a.bary[2];
  const vx = c.bary[1] - a.bary[1];
  const vy = c.bary[2] - a.bary[2];
  return ux * vy - uy * vx;
}

function contenders(problem: Problem, corners: readonly number[]): number[] {
  const { weights, partCount } = problem;
  return Array.from({ length: partCount }, (_, part) => part).filter((part) =>
    corners.some((corner) => weights[corner * partCount + part] > 0),
  );
}

function winnerAt(weights: Float32Array, partCount: number, vertex: number): number {
  let best = 0;
  for (let p = 1; p < partCount; p++) {
    if (weights[vertex * partCount + p] > weights[vertex * partCount + best]) best = p;
  }
  return best;
}

function cornerField(
  problem: Problem,
  corners: readonly number[],
  part: number,
  other: number,
): Barycentric {
  const at = (corner: number) => {
    const base = corner * problem.partCount;
    return problem.weights[base + part] - problem.weights[base + other];
  };
  return [at(corners[0]), at(corners[1]), at(corners[2])];
}

function regionOf(
  problem: Problem,
  corners: readonly number[],
  part: number,
  rivals: readonly number[],
): Point[] {
  let polygon: Point[] = [
    { bary: [1, 0, 0], cut: -1 },
    { bary: [0, 1, 0], cut: -1 },
    { bary: [0, 0, 1], cut: -1 },
  ];
  for (const rival of rivals) {
    if (rival === part) continue;
    const field = cornerField(problem, corners, part, rival);
    polygon = clip(polygon, field, cutCode(part, rival, problem.partCount));
  }
  return polygon;
}

function emitRegion(
  polygon: Point[],
  corners: readonly number[],
  builder: Builder,
  local: Map<string, number>,
  out: Bucket,
  source: number,
): void {
  for (let i = 1; i + 1 < polygon.length; i++) {
    if (areaShare(polygon[0], polygon[i], polygon[i + 1]) <= MIN_AREA_SHARE) continue;
    for (const point of [polygon[0], polygon[i], polygon[i + 1]]) {
      out.indices.push(builder.resolve(point, corners, local));
    }
    out.sources.push(source);
  }
}

function concatenate(buckets: Bucket[], builder: Builder): Partition {
  const total = buckets.reduce((sum, bucket) => sum + bucket.indices.length, 0);
  const indices = new Uint32Array(total);
  const sourceTriangles = new Uint32Array(total / CORNERS);
  const ranges: PartRange[] = [];
  let at = 0;
  buckets.forEach((bucket, part) => {
    indices.set(bucket.indices, at);
    sourceTriangles.set(bucket.sources, at / CORNERS);
    const count = bucket.indices.length;
    if (count > 0) ranges.push({ part, start: at, count });
    at += count;
  });
  const count = builder.sources.length / CORNERS;
  const added = {
    count,
    sources: Uint32Array.from(builder.sources),
    weights: Float32Array.from(builder.blends),
  };
  return { indices, sourceTriangles, ranges, added };
}

export function partitionTriangles(
  triangles: ArrayLike<number>,
  vertexCount: number,
  weights: Float32Array,
  partCount: number,
): Partition {
  const problem: Problem = { vertexCount, weights, partCount };
  const builder = new Builder(problem);
  const winners = Uint8Array.from({ length: vertexCount }, (_, v) =>
    winnerAt(weights, partCount, v),
  );
  const buckets = Array.from({ length: partCount }, (): Bucket => ({ indices: [], sources: [] }));
  for (let t = 0; t < triangles.length; t += CORNERS) {
    const corners = [triangles[t], triangles[t + 1], triangles[t + 2]];
    const winning = new Set(corners.map((corner) => winners[corner]));
    if (winning.size === 1) {
      const [part] = winning;
      buckets[part].indices.push(...corners);
      buckets[part].sources.push(t / CORNERS);
      continue;
    }
    const rivals = contenders(problem, corners);
    const local = new Map<string, number>();
    for (const part of rivals) {
      const polygon = regionOf(problem, corners, part, rivals);
      emitRegion(polygon, corners, builder, local, buckets[part], t / CORNERS);
    }
  }
  return concatenate(buckets, builder);
}
