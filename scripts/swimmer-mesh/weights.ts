import {
  BONE_COUNT,
  mirrorBone,
  centreBone,
  INFLUENCES,
  sideBone,
  type SideBoneId,
} from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';
import type { BoneWeights, Skeleton } from './source.ts';

type Target = SideBoneId | 'trunk' | 'neck' | 'head';

const BONE_RULES: readonly (readonly [RegExp, Target])[] = [
  [/^neck0\d$/, 'neck'],
  [/^head$/, 'head'],
  [/^(clavicle|shoulder01)\./, 'girdle'],
  [/^upperarm01\./, 'upperArmRoot'],
  [/^upperarm02\./, 'upperArm'],
  [/^lowerarm01\./, 'forearmRoot'],
  [/^lowerarm02\./, 'forearm'],
  [/^(wrist|metacarpal\d|finger\d-\d)\./, 'hand'],
  [/^upperleg0[12]\./, 'thigh'],
  [/^lowerleg0[12]\./, 'shin'],
  [/^(foot|toe\d-\d)\./, 'foot'],
  [/^(root|spine0\d|pelvis\.|breast\.)/, 'trunk'],
];

const PELVIS_KNOT = 0.868;
const SPINE_LOW_KNOT = 0.651;
const SPINE_MID_KNOT = 0.434;
const CHEST_KNOT = 0.222;

const CENTRE_TARGETS: readonly Target[] = ['neck', 'head'];
const TRUNK_BONES = ['pelvis', 'spineLow', 'spineMid', 'chest'] as const;

function resolveTarget(skeleton: Skeleton, name: string): Target {
  let current: string | null = name;
  while (current) {
    const rule = BONE_RULES.find(([pattern]) => pattern.test(current as string));
    if (rule) return rule[1];
    current = skeleton.bones[current]?.parent ?? null;
  }
  return 'trunk';
}

function boneIndex(target: Target, name: string): number {
  if (target === 'trunk') return -1;
  if (CENTRE_TARGETS.includes(target)) return centreBone(target as 'neck' | 'head');
  return sideBone(target as SideBoneId, name.endsWith('.L') ? 'left' : 'right');
}

function trunkShares(x: number, hipX: number): number[] {
  const knots = [PELVIS_KNOT, SPINE_LOW_KNOT, SPINE_MID_KNOT, CHEST_KNOT].map(
    (knot) => knot * hipX,
  );
  const shares = [0, 0, 0, 0];
  if (x <= knots[0]) shares[0] = 1;
  else if (x >= knots[3]) shares[3] = 1;
  else {
    const upper = knots.findIndex((knot) => knot >= x);
    const t = (x - knots[upper - 1]) / (knots[upper] - knots[upper - 1]);
    shares[upper - 1] = 1 - t;
    shares[upper] = t;
  }
  return shares;
}

export function mapWeights(
  skeleton: Skeleton,
  weights: BoneWeights,
  vertexCount: number,
  restX: (vertex: number) => number,
  hipX: number,
  isMidline: (vertex: number) => boolean,
): { joints: Uint8Array; weights: Float32Array } {
  const dense = new Float32Array(vertexCount * BONE_COUNT);
  const trunk = new Float32Array(vertexCount);
  for (const [name, entries] of Object.entries(weights)) {
    const target = resolveTarget(skeleton, name);
    const bone = boneIndex(target, name);
    for (const [vertex, weight] of entries) {
      if (vertex >= vertexCount) continue;
      if (bone < 0) trunk[vertex] += weight;
      else dense[vertex * BONE_COUNT + bone] += weight;
    }
  }
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    if (trunk[vertex] === 0) continue;
    const shares = trunkShares(restX(vertex), hipX);
    TRUNK_BONES.forEach(
      (id, i) => (dense[vertex * BONE_COUNT + centreBone(id)] += trunk[vertex] * shares[i]),
    );
  }
  return topInfluences(dense, vertexCount, isMidline);
}

function symmetrise(dense: Float32Array, vertex: number): void {
  for (let bone = 0; bone < BONE_COUNT; bone++) {
    const twin = mirrorBone(bone);
    if (twin <= bone) continue;
    const mean = (dense[vertex * BONE_COUNT + bone] + dense[vertex * BONE_COUNT + twin]) / 2;
    dense[vertex * BONE_COUNT + bone] = mean;
    dense[vertex * BONE_COUNT + twin] = mean;
  }
}

function pickBones(dense: Float32Array, vertex: number, symmetric: boolean): number[] {
  const bones = Array.from({ length: BONE_COUNT }, (_, bone) => bone);
  const byWeight = bones.sort(
    (a, b) => dense[vertex * BONE_COUNT + b] - dense[vertex * BONE_COUNT + a] || a - b,
  );
  const picked: number[] = [];
  for (const bone of byWeight) {
    const group = symmetric && mirrorBone(bone) !== bone ? [bone, mirrorBone(bone)] : [bone];
    if (picked.includes(bone) || picked.length + group.length > INFLUENCES) continue;
    picked.push(...group);
  }
  return picked;
}

function topInfluences(
  dense: Float32Array,
  vertexCount: number,
  isMidline: (vertex: number) => boolean,
): { joints: Uint8Array; weights: Float32Array } {
  const joints = new Uint8Array(vertexCount * INFLUENCES);
  const weights = new Float32Array(vertexCount * INFLUENCES);
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    const midline = isMidline(vertex);
    if (midline) symmetrise(dense, vertex);
    const row = pickBones(dense, vertex, midline);
    const total = row.reduce((sum, bone) => sum + dense[vertex * BONE_COUNT + bone], 0) || 1;
    for (let slot = 0; slot < INFLUENCES; slot++) {
      const bone = row[slot] ?? row[0];
      joints[vertex * INFLUENCES + slot] = bone;
      weights[vertex * INFLUENCES + slot] =
        row[slot] === undefined ? 0 : dense[vertex * BONE_COUNT + bone] / total;
    }
  }
  return { joints, weights };
}
