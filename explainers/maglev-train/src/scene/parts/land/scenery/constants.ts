import type { Range } from '../random';

export const TREE_ROWS = {
  seed: 3_117,
  run: [30, 90] as Range,
  gap: [34, 120] as Range,
  crossingClear: 4,
  scale: [0.85, 1.2] as Range,
  jitter: 0.9,
  reach: 420,
  near: 160,
  byKind: {
    road: { sides: 2, spacing: [9, 12] as Range, kinds: ['poplar', 'conifer'] },
    lane: { sides: 1, spacing: [10, 14] as Range, kinds: ['round', 'poplar'] },
    canal: { sides: 1, spacing: [9, 13] as Range, kinds: ['round'] },
    river: { sides: 1, spacing: [11, 16] as Range, kinds: ['round'] },
  },
} as const;

export const COPSES = {
  seed: 9_041,
  chance: 0.18,
  count: [5, 12] as Range,
  radius: [10, 22] as Range,
  inset: 6,
  scale: [0.8, 1.35] as Range,
  zRange: [60, 420] as Range,
} as const;

export const VILLAGES = {
  seed: 5_501,
  perTile: 2,
  inset: 5,
  minSize: [70, 42] as Range,
  maxSize: [100, 58] as Range,
  zRange: [70, 520] as Range,
  rowPitch: [19, 24] as Range,
  housePitch: [15, 19] as Range,
  houseChance: 0.74,
  turnJitter: 0.05,
  treeChance: 0.55,
  treeOffset: [5, 8] as Range,
} as const;

export const DISTANT = {
  seed: 1_909,
  zRange: [720, 1300] as Range,
  clusters: 7,
  perCluster: [3, 9] as Range,
  spread: [60, 160] as Range,
  slab: { length: [40, 70] as Range, depth: [12, 16] as Range, height: [18, 36] as Range },
  shed: { length: [50, 110] as Range, depth: [30, 60] as Range, height: [8, 14] as Range },
  slabShare: 0.55,
} as const;
