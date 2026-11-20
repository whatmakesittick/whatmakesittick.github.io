export type Triple = readonly [number, number, number];

export const SIDE_BONE_IDS = [
  'girdle',
  'upperArmRoot',
  'upperArm',
  'forearmRoot',
  'forearm',
  'hand',
  'thigh',
  'shin',
  'foot',
] as const;

export const CENTRE_BONE_IDS = ['pelvis', 'spineLow', 'spineMid', 'chest', 'neck', 'head'] as const;

export type SideBoneId = (typeof SIDE_BONE_IDS)[number];
export type CentreBoneId = (typeof CENTRE_BONE_IDS)[number];

export const BONE_COUNT = CENTRE_BONE_IDS.length + 2 * SIDE_BONE_IDS.length;

export function centreBone(id: CentreBoneId): number {
  return CENTRE_BONE_IDS.indexOf(id);
}

export function sideBone(id: SideBoneId, side: 'right' | 'left'): number {
  const offset = side === 'right' ? 0 : SIDE_BONE_IDS.length;
  return CENTRE_BONE_IDS.length + offset + SIDE_BONE_IDS.indexOf(id);
}

export function mirrorBone(bone: number): number {
  if (bone < CENTRE_BONE_IDS.length) return bone;
  const local = bone - CENTRE_BONE_IDS.length;
  const count = SIDE_BONE_IDS.length;
  return CENTRE_BONE_IDS.length + ((local + count) % (2 * count));
}

export const SLOT_IDS = [
  'hand',
  'forearm',
  'upperArm',
  'chest',
  'abdomen',
  'jammers',
  'legSuit',
  'leg',
  'face',
  'cap',
  'capStripe',
] as const;

export type SlotId = (typeof SLOT_IDS)[number];

export const MIRRORED_SLOT: Readonly<Partial<Record<SlotId, SlotId>>> = { capStripe: 'cap' };

export const INFLUENCES = 4;

export interface RestSide {
  readonly shoulder: Triple;
  readonly elbow: Triple;
  readonly wrist: Triple;
  readonly fingertip: Triple;
  readonly palm: Triple;
  readonly elbowBack: Triple;
  readonly hip: Triple;
  readonly knee: Triple;
  readonly ankle: Triple;
  readonly toeTip: Triple;
  readonly sole: Triple;
  readonly eye: Triple;
}

export interface RestPose {
  readonly right: RestSide;
  readonly left: RestSide;
  readonly neck: Triple;
  readonly headTop: Triple;
  readonly eyeRadius: number;
  readonly strap: readonly Triple[];
}

export interface SkinMesh {
  readonly vertexCount: number;
  readonly positions: Float32Array;
  readonly joints: Uint8Array;
  readonly weights: Float32Array;
  readonly slots: Readonly<Record<SlotId, Uint16Array>>;
  readonly rest: RestPose;
}
