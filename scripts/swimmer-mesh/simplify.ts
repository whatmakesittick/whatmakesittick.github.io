import { MeshoptSimplifier } from 'meshoptimizer';
import {
  BONE_COUNT,
  INFLUENCES,
  SLOT_IDS,
  type SlotId,
} from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';
import { midlineFolds } from './checks.ts';
import { REGION_IDS, type RegionId } from './slots.ts';
import type { Model } from './topology.ts';

const TARGET_ERROR = 0.02;
const ATTRIBUTE_WEIGHT = 0.02;
const INDICES_PER_TRIANGLE = 3;

export type RegionKeep = Readonly<Record<RegionId, number>>;

export interface SimplifyBudget {
  readonly keep: RegionKeep;
  readonly total: number;
}

function boneAttributes(model: Model): Float32Array {
  const count = model.positions.length / 3;
  const attributes = new Float32Array(count * BONE_COUNT);
  for (let v = 0; v < count; v++) {
    for (let k = 0; k < INFLUENCES; k++) {
      attributes[v * BONE_COUNT + model.joints[v * INFLUENCES + k]] +=
        model.weights[v * INFLUENCES + k];
    }
  }
  return attributes;
}

const MAX_REPAIR_ROUNDS = 8;
const REPAIR_RINGS = 2;

function simplifyIndices(
  indices: number[],
  positions: Float32Array,
  attributes: Float32Array,
  locked: Uint8Array,
  target: number,
): number[] {
  const weights = new Array<number>(BONE_COUNT).fill(ATTRIBUTE_WEIGHT);
  const [simplified] = MeshoptSimplifier.simplifyWithAttributes(
    Uint32Array.from(indices),
    positions,
    3,
    attributes,
    BONE_COUNT,
    weights,
    locked,
    Math.min(indices.length, Math.round(target / INDICES_PER_TRIANGLE) * INDICES_PER_TRIANGLE),
    TARGET_ERROR,
    ['LockBorder'],
  );
  return Array.from(simplified);
}

function trianglesOfRegion(
  model: Model,
  regionOf: readonly RegionId[],
  region: RegionId,
): number[] {
  const indices: number[] = [];
  regionOf.forEach((owner, t) => {
    if (owner === region)
      indices.push(
        ...model.triangles.slice(t * INDICES_PER_TRIANGLE, (t + 1) * INDICES_PER_TRIANGLE),
      );
  });
  return indices;
}

function simplifyOnce(
  model: Model,
  regionOf: readonly RegionId[],
  budget: SimplifyBudget,
  locked: Uint8Array,
): number[] {
  const positions = Float32Array.from(model.positions);
  const attributes = boneAttributes(model);
  const merged = REGION_IDS.flatMap((region) => {
    const indices = trianglesOfRegion(model, regionOf, region);
    return simplifyIndices(
      indices,
      positions,
      attributes,
      locked,
      indices.length * budget.keep[region],
    );
  });
  return simplifyIndices(
    merged,
    positions,
    attributes,
    locked,
    budget.total * INDICES_PER_TRIANGLE,
  );
}

function lockAround(model: Model, seeds: number[], locked: Uint8Array): void {
  let ring = new Set(seeds);
  for (let step = 0; step <= REPAIR_RINGS; step++) {
    ring.forEach((v) => (locked[v] = 1));
    const next = new Set<number>();
    for (let i = 0; i < model.triangles.length; i += 3) {
      const corners = [model.triangles[i], model.triangles[i + 1], model.triangles[i + 2]];
      if (corners.some((v) => ring.has(v))) corners.forEach((v) => next.add(v));
    }
    ring = next;
  }
}

export async function simplifyBody(
  model: Model,
  regionOf: readonly RegionId[],
  budget: SimplifyBudget,
): Promise<number[]> {
  await MeshoptSimplifier.ready;
  const locked = new Uint8Array(model.positions.length / 3);
  for (let round = 0; round < MAX_REPAIR_ROUNDS; round++) {
    const result = simplifyOnce(model, regionOf, budget, locked);
    const folds = midlineFolds({ body: result }, model.positions);
    if (folds.length === 0) return result;
    lockAround(model, folds.flat(), locked);
  }
  throw new Error('Simplification kept folding the midline');
}

export function reorderByFirstUse(slots: Record<SlotId, number[]>): {
  order: number[];
  slots: Record<SlotId, number[]>;
} {
  const newIndex = new Map<number, number>();
  const order: number[] = [];
  const remapped = {} as Record<SlotId, number[]>;
  for (const slot of SLOT_IDS) {
    remapped[slot] = slots[slot].map((vertex) => {
      if (!newIndex.has(vertex)) {
        newIndex.set(vertex, order.length);
        order.push(vertex);
      }
      return newIndex.get(vertex)!;
    });
  }
  return { order, slots: remapped };
}
