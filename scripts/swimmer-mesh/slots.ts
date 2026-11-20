import {
  INFLUENCES,
  mirrorBone,
  sideBone,
  centreBone,
  type SlotId,
  type SideBoneId,
} from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';
import type { Model } from './topology.ts';
import { dot, normalize, point, sub, type Vec } from './vec.ts';

export interface SlotRules {
  hip: Vec;
  knee: Vec;
  hipX: number;
  eye: Vec;
}

const LOWER_RIB = 0.4;
const WAIST_ABOVE_HIP = 0.04;
const CREASE_BELOW_HIP = 0.07;
const SUIT_ENDS_ABOVE_KNEE = 0.04;
const CAP_FOREHEAD_ABOVE_EYE = 0.025;
const CAP_NAPE_BELOW_EYE = 0.075;
const STRIPE_CENTRE = 0.05;
const STRIPE_HALF_WIDTH = 0.01;
const HEAD_WEIGHT = 0.5;

const GROUPS: Record<string, readonly SideBoneId[]> = {
  hand: ['hand'],
  forearm: ['forearmRoot', 'forearm'],
  upperArm: ['upperArmRoot', 'upperArm'],
  girdle: ['girdle'],
};
const GROUP_SLOT: Record<string, SlotId> = {
  hand: 'hand',
  forearm: 'forearm',
  upperArm: 'upperArm',
  girdle: 'chest',
};
const HEAD_BONES = [centreBone('head'), centreBone('neck')];
const BODY_GROUP_BONES: Record<string, number[]> = Object.fromEntries([
  ...Object.entries(GROUPS).map(([name, ids]) => [
    name,
    ids.flatMap((id) => [sideBone(id, 'right'), sideBone(id, 'left')]),
  ]),
  ['head', HEAD_BONES],
]);

export function headWeight(model: Model, vertex: number): number {
  let total = 0;
  for (let k = 0; k < INFLUENCES; k++) {
    if (HEAD_BONES.includes(model.joints[vertex * INFLUENCES + k]))
      total += model.weights[vertex * INFLUENCES + k];
  }
  return total;
}

function groupWeights(model: Model, vertices: number[]): Record<string, number> {
  const sums: Record<string, number> = Object.fromEntries(
    Object.keys(BODY_GROUP_BONES).map((name) => [name, 0]),
  );
  for (const vertex of vertices) {
    for (let k = 0; k < INFLUENCES; k++) {
      const bone = model.joints[vertex * INFLUENCES + k];
      for (const [name, bones] of Object.entries(BODY_GROUP_BONES)) {
        if (bones.includes(bone) || bones.includes(mirrorBone(bone)))
          sums[name] += model.weights[vertex * INFLUENCES + k];
      }
    }
  }
  return sums;
}

function dominantGroup(sums: Record<string, number>, vertexCount: number): string | null {
  const [name, value] = Object.entries(sums).sort((a, b) => b[1] - a[1])[0];
  return value > vertexCount / 2 ? name : null;
}

export function classifyTriangles(model: Model, rules: SlotRules): SlotId[] {
  const axis = normalize(sub(rules.knee, rules.hip));
  const waistX = rules.hipX + WAIST_ABOVE_HIP;
  const ribX = LOWER_RIB * rules.hipX;
  const kneeCut = dot(sub(rules.knee, rules.hip), axis) - SUIT_ENDS_ABOVE_KNEE;
  const slots: SlotId[] = [];
  for (let i = 0; i < model.triangles.length; i += 3) {
    const vertices = [model.triangles[i], model.triangles[i + 1], model.triangles[i + 2]];
    const centre = vertices.reduce<Vec>(
      (sum, v) => sum.map((value, k) => value + model.positions[v * 3 + k] / 3) as Vec,
      [0, 0, 0],
    );
    const group = dominantGroup(groupWeights(model, vertices), vertices.length);
    if (group === 'head') slots.push(isCap(model, vertices, centre, rules.eye) ? 'cap' : 'face');
    else if (group) slots.push(GROUP_SLOT[group]);
    else if (centre[0] > ribX) slots.push('chest');
    else if (centre[0] > waistX) slots.push('abdomen');
    else {
      const along = dot(sub(centre, rules.hip), axis);
      slots.push(along < CREASE_BELOW_HIP ? 'jammers' : along < kneeCut ? 'legSuit' : 'leg');
    }
  }
  return slots.map((slot, t) => (slot === 'cap' && isStripe(model, t) ? 'capStripe' : slot));
}

function isCap(model: Model, vertices: number[], centre: Vec, eye: Vec): boolean {
  const headExtent = capPlaneExtent(model);
  const t = Math.min(1, Math.max(0, (centre[1] - eye[1]) / (headExtent.back - eye[1])));
  const planeX =
    eye[0] + CAP_FOREHEAD_ABOVE_EYE - t * (CAP_FOREHEAD_ABOVE_EYE + CAP_NAPE_BELOW_EYE);
  return centre[0] > planeX && vertices.every((v) => headWeight(model, v) > HEAD_WEIGHT);
}

const extentCache = new WeakMap<Model, { back: number }>();

function capPlaneExtent(model: Model): { back: number } {
  const cached = extentCache.get(model);
  if (cached) return cached;
  let back = -Infinity;
  for (let v = 0; v < model.positions.length / 3; v++) {
    if (headWeight(model, v) > HEAD_WEIGHT) back = Math.max(back, model.positions[v * 3 + 1]);
  }
  const extent = { back };
  extentCache.set(model, extent);
  return extent;
}

function isStripe(model: Model, triangle: number): boolean {
  const z =
    [0, 1, 2].reduce(
      (sum, k) => sum + point(model.positions, model.triangles[triangle * 3 + k])[2],
      0,
    ) / 3;
  return Math.abs(z - STRIPE_CENTRE) < STRIPE_HALF_WIDTH;
}
