import { MeshoptSimplifier } from 'meshoptimizer';
import {
  BONE_COUNT,
  INFLUENCES,
  SLOT_IDS,
  type SlotId,
} from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';
import { midlineFolds } from './checks.ts';
import { stripOrder } from './order.ts';
import type { Model } from './topology.ts';

const TARGET_ERROR = 0.02;
const ATTRIBUTE_WEIGHT = 0.02;
const INDICES_PER_TRIANGLE = 3;

export type SlotKeep = Readonly<Record<SlotId, number>>;

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

function simplifyOnce(
  model: Model,
  slotOf: readonly SlotId[],
  keep: SlotKeep,
  locked: Uint8Array,
): Record<SlotId, number[]> {
  const positions = Float32Array.from(model.positions);
  const attributes = boneAttributes(model);
  const weights = new Array<number>(BONE_COUNT).fill(ATTRIBUTE_WEIGHT);
  const result = {} as Record<SlotId, number[]>;
  for (const slot of SLOT_IDS) {
    const indices: number[] = [];
    slotOf.forEach((owner, t) => {
      if (owner === slot)
        indices.push(
          ...model.triangles.slice(t * INDICES_PER_TRIANGLE, (t + 1) * INDICES_PER_TRIANGLE),
        );
    });
    const target =
      Math.round((indices.length * keep[slot]) / INDICES_PER_TRIANGLE) * INDICES_PER_TRIANGLE;
    const [simplified] = MeshoptSimplifier.simplifyWithAttributes(
      Uint32Array.from(indices),
      positions,
      3,
      attributes,
      BONE_COUNT,
      weights,
      locked,
      target,
      TARGET_ERROR,
      ['LockBorder'],
    );
    result[slot] = stripOrder(Array.from(simplified));
  }
  return result;
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

export async function simplifySlots(
  model: Model,
  slotOf: readonly SlotId[],
  keep: SlotKeep,
): Promise<Record<SlotId, number[]>> {
  await MeshoptSimplifier.ready;
  const locked = new Uint8Array(model.positions.length / 3);
  for (let round = 0; round < MAX_REPAIR_ROUNDS; round++) {
    const result = simplifyOnce(model, slotOf, keep, locked);
    const folds = midlineFolds(result, model.positions);
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
