import { BODY_GROUP, DATA_ROOT, targetTable, type WeightedTarget } from './config.ts';
import { fetchSource } from './download.ts';

export interface BaseMesh {
  readonly positions: Float64Array;
  readonly triangles: number[];
  readonly groupVertices: Record<string, Set<number>>;
}

export interface Skeleton {
  readonly bones: Record<string, { head: string; parent: string | null }>;
  readonly joints: Record<string, number[]>;
}

export type BoneWeights = Record<string, [number, number][]>;

export interface Source {
  readonly base: BaseMesh;
  readonly skeleton: Skeleton;
  readonly weights: BoneWeights;
  readonly targets: { target: WeightedTarget; deltas: Float64Array }[];
}

const TARGET_SEPARATOR = /\s+/;

export function parseBaseObj(text: string): BaseMesh {
  const coordinates: number[] = [];
  const triangles: number[] = [];
  const groupVertices: Record<string, Set<number>> = {};
  let group = '';
  for (const line of text.split('\n')) {
    if (line.startsWith('v '))
      coordinates.push(...line.slice(2).trim().split(TARGET_SEPARATOR).map(Number));
    else if (line.startsWith('g ')) group = line.slice(2).trim();
    else if (line.startsWith('f ')) {
      const face = line
        .slice(2)
        .trim()
        .split(TARGET_SEPARATOR)
        .map((corner) => Number(corner.split('/')[0]) - 1);
      if (group === BODY_GROUP)
        for (let i = 1; i + 1 < face.length; i++) triangles.push(face[0], face[i], face[i + 1]);
      else face.forEach((v) => (groupVertices[group] ??= new Set()).add(v));
    }
  }
  return { positions: Float64Array.from(coordinates), triangles, groupVertices };
}

export function parseTarget(text: string, vertexCount: number): Float64Array {
  const deltas = new Float64Array(vertexCount * 3);
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [index, x, y, z] = line.trim().split(TARGET_SEPARATOR).map(Number);
    deltas.set([x, y, z], index * 3);
  }
  return deltas;
}

export async function loadSource(): Promise<Source> {
  const [obj, skeleton, weights] = await Promise.all([
    fetchSource(`${DATA_ROOT}/3dobjs/base.obj`),
    fetchSource(`${DATA_ROOT}/rigs/default.mhskel`),
    fetchSource(`${DATA_ROOT}/rigs/default_weights.mhw`),
  ]);
  const base = parseBaseObj(obj);
  const vertexCount = base.positions.length / 3;
  const targets = await Promise.all(
    targetTable().map(async (target) => ({
      target,
      deltas: parseTarget(
        await fetchSource(`${DATA_ROOT}/targets/${target.path}.target`),
        vertexCount,
      ),
    })),
  );
  return {
    base,
    skeleton: JSON.parse(skeleton) as Skeleton,
    weights: (JSON.parse(weights) as { weights: BoneWeights }).weights,
    targets,
  };
}
