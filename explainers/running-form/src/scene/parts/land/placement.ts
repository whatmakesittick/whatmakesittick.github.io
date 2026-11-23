import { Vector3 } from 'three';
import { NEAR_STRIP_M, PATTERN_PERIODS_M } from '../../../model/layout';
import type { StripItem } from './strip';

export type Random = () => number;

const UINT32 = 2 ** 32;
const MIX_STEP = 0x6d2b79f5;

export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + MIX_STEP) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32;
  };
}

function between(random: Random, from: number, to: number): number {
  return from + (to - from) * random();
}

export const POST_OFFSETS = { delineator: 23, lamp: 7, railStanchion: 0 } as const;
export const RAIL_STANCHION_M = 2.4;

export const LAMP = { heightM: 6.2, armM: 1.7, poleRadiusM: 0.07 } as const;

export type TreeKind = 'pine' | 'round';

export interface TreeItem extends StripItem {
  readonly kind: TreeKind;
  readonly tint: number;
}

interface TreeBand {
  readonly period: number;
  readonly perGroup: readonly [number, number];
  readonly z: readonly [number, number];
  readonly height: readonly [number, number];
  readonly spread: number;
  readonly pineShare: number;
}

const TREE_BANDS: readonly TreeBand[] = [
  {
    period: PATTERN_PERIODS_M.treeGroupLong,
    perGroup: [2, 4],
    z: [16, 34],
    height: [6.5, 10],
    spread: 5,
    pineShare: 0.6,
  },
  {
    period: PATTERN_PERIODS_M.treeGroupShort,
    perGroup: [1, 3],
    z: [24, 48],
    height: [5, 8.5],
    spread: 4,
    pineShare: 0.35,
  },
];

const SHRUB = { perStrip: 70, z: [7.2, 15] as const, size: [0.35, 0.9] as const };
const TUFT = { perStrip: 420, z: [5.9, 15.5] as const, size: [0.18, 0.42] as const };
const SEED = { trees: 11, shrubs: 23, tufts: 37 } as const;

function treeBand(random: Random, band: TreeBand): TreeItem[] {
  const groups = NEAR_STRIP_M / band.period;
  return Array.from({ length: groups }, (_, group) => {
    const centre = group * band.period + between(random, 0, band.period);
    const z = between(random, band.z[0], band.z[1]);
    const count = Math.round(between(random, band.perGroup[0], band.perGroup[1]));
    return Array.from({ length: count }, (): TreeItem => {
      const height = between(random, band.height[0], band.height[1]);
      const kind: TreeKind = random() < band.pineShare ? 'pine' : 'round';
      const width =
        height * (kind === 'pine' ? between(random, 0.32, 0.42) : between(random, 0.5, 0.7));
      return {
        x: centre + between(random, -band.spread, band.spread),
        y: 0,
        z: z + between(random, -band.spread, band.spread),
        scale: new Vector3(width, height, width),
        turn: between(random, 0, Math.PI * 2),
        kind,
        tint: random(),
      };
    });
  }).flat();
}

export function treeItems(): TreeItem[] {
  const random = seededRandom(SEED.trees);
  return TREE_BANDS.flatMap((band) => treeBand(random, band));
}

function scattered(
  seed: number,
  count: number,
  z: readonly [number, number],
  size: readonly [number, number],
): StripItem[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const s = between(random, size[0], size[1]);
    return {
      x: between(random, 0, NEAR_STRIP_M),
      y: 0,
      z: between(random, z[0], z[1]),
      scale: new Vector3(s * between(random, 0.9, 1.5), s, s * between(random, 0.9, 1.5)),
      turn: between(random, 0, Math.PI * 2),
    };
  });
}

export function shrubItems(): StripItem[] {
  return scattered(SEED.shrubs, SHRUB.perStrip, SHRUB.z, SHRUB.size);
}

export function tuftItems(): StripItem[] {
  return scattered(SEED.tufts, TUFT.perStrip, TUFT.z, TUFT.size);
}

export function periodicItems(
  period: number,
  offset: number,
  z: number,
  scale = new Vector3(1, 1, 1),
): StripItem[] {
  return Array.from({ length: Math.round(NEAR_STRIP_M / period) }, (_, index) => ({
    x: offset + index * period,
    y: 0,
    z,
    scale,
    turn: 0,
  }));
}
