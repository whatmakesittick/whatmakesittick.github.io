import { FULL_TURN, clamp } from '@core/math';
import { wrapPhase } from '@core/store';
import { GROUND, SCENERY } from '../constants';
import type { Block } from '../ground/blocks';
import type { Field } from '../ground/fields';
import { between, extent, seededRandom, shrunk, weighted } from '../random';
import type { Random, Range } from '../random';
import { VILLAGES } from './constants';
import { isOpenBlock } from './treePlacement';
import type { TreeSpot } from './treePlacement';

export const HOUSE_KINDS = ['villa', 'house', 'workshop'] as const;
export type HouseKind = (typeof HOUSE_KINDS)[number];

export interface HouseSpot {
  readonly kind: HouseKind;
  readonly x: number;
  readonly z: number;
  readonly turn: number;
  readonly length: number;
  readonly depth: number;
  readonly height: number;
  readonly seed: number;
}

export interface YardSpot {
  readonly x: number;
  readonly z: number;
  readonly turn: number;
  readonly length: number;
  readonly depth: number;
}

export interface VillagePlan {
  readonly houses: readonly HouseSpot[];
  readonly yards: readonly YardSpot[];
  readonly trees: readonly TreeSpot[];
}

interface HouseShape {
  readonly length: Range;
  readonly depth: Range;
  readonly height: Range;
}

export const HOUSE_SHAPES: Readonly<Record<HouseKind, HouseShape>> = {
  villa: { length: [12, 15], depth: [9, 11], height: [9.4, 10.4] },
  house: { length: [10, 13], depth: [8, 9.5], height: [6.3, 7.1] },
  workshop: { length: [16, 24], depth: [10, 14], height: [4.6, 6] },
};

const HOUSE_WEIGHTS: Readonly<Record<HouseKind, number>> = {
  villa: 0.45,
  house: 0.4,
  workshop: 0.15,
};
const YARD = { grow: [4, 6], south: 2.5 } as const;
const TREE_SCALE: Range = [0.8, 1.25];

function fits(block: Block, fields: readonly Field[]): boolean {
  const [minLength, minDepth] = VILLAGES.minSize;
  const room = VILLAGES.inset * 2;
  const roomy = extent(block.x) > minLength + room && extent(block.z) > minDepth + room;
  return roomy && isOpenBlock(block, fields, VILLAGES.reach);
}

function placeWithin(range: Range, length: number, random: Random): Range {
  const [from, to] = shrunk(range, VILLAGES.inset);
  const start = between(random, [from, to - length]);
  return [start, start + length];
}

function house(x: number, z: number, random: Random): HouseSpot {
  const kind = weighted(random, HOUSE_WEIGHTS);
  const shape = HOUSE_SHAPES[kind];
  return {
    kind,
    x,
    z,
    turn: (random() * 2 - 1) * VILLAGES.turnJitter,
    length: between(random, shape.length),
    depth: between(random, shape.depth),
    height: between(random, shape.height),
    seed: random(),
  };
}

function yardOf(spot: HouseSpot): YardSpot {
  return {
    x: spot.x,
    z: spot.z + YARD.south,
    turn: spot.turn,
    length: spot.length + YARD.grow[0],
    depth: spot.depth + YARD.grow[1],
  };
}

function villageTree(spot: HouseSpot, random: Random): TreeSpot {
  const angle = random() * FULL_TURN;
  const reach = Math.max(spot.length, spot.depth) / 2 + between(random, VILLAGES.treeOffset);
  return {
    x: spot.x + Math.cos(angle) * reach,
    z: spot.z + Math.sin(angle) * reach,
    scale: between(random, TREE_SCALE),
    seed: random(),
    kind: 'round',
  };
}

function clampTo(value: number, range: Range): number {
  return clamp(value, ...shrunk(range, VILLAGES.inset));
}

function insideBlock(tree: TreeSpot, block: Block, shift: number): TreeSpot {
  return { ...tree, x: clampTo(tree.x - shift, block.x) + shift, z: clampTo(tree.z, block.z) };
}

function pitched(range: Range, pitch: Range, random: Random, visit: (at: number) => void): void {
  const half = pitch[0] / 2;
  for (let at = range[0] + half; at + half <= range[1]; at += between(random, pitch)) visit(at);
}

function village(block: Block, shift: number, random: Random): VillagePlan {
  const [maxLength, maxDepth] = VILLAGES.maxSize;
  const length = Math.min(maxLength, extent(block.x) - VILLAGES.inset * 2);
  const depth = Math.min(maxDepth, extent(block.z) - VILLAGES.inset * 2);
  const x = placeWithin(block.x, length, random);
  const z = placeWithin(block.z, depth, random);
  const houses: HouseSpot[] = [];
  pitched(z, VILLAGES.rowPitch, random, (atZ) =>
    pitched(x, VILLAGES.housePitch, random, (atX) => {
      if (random() < VILLAGES.houseChance) houses.push(house(atX + shift, atZ, random));
    }),
  );
  const trees = houses
    .filter(() => random() < VILLAGES.treeChance)
    .map((spot) => insideBlock(villageTree(spot, random), block, shift));
  return { houses, yards: houses.map(yardOf), trees };
}

function shuffled<T>(items: readonly T[], random: Random): T[] {
  return items
    .map((item) => ({ item, order: random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);
}

function pickBlocks(candidates: readonly Block[], random: Random): Block[] {
  const [left, right] = [
    candidates.filter((block) => block.z[1] < 0),
    candidates.filter((block) => block.z[0] > 0),
  ].map((side) => shuffled(side, random));
  const chosen = [left[0], right[0], ...shuffled([...left.slice(1), ...right.slice(1)], random)];
  return chosen.filter(Boolean).slice(0, VILLAGES.perTile);
}

export function tileVillages(blocks: readonly Block[], fields: readonly Field[]): VillagePlan {
  const random = seededRandom(VILLAGES.seed);
  const candidates = blocks.filter((block) => fits(block, fields));
  const tiles = Math.round(SCENERY.villagePeriod / GROUND.period);
  const plans = Array.from({ length: tiles }, (_, tile) =>
    pickBlocks(candidates, random).map((block) => village(block, tile * GROUND.period, random)),
  ).flat();
  const wrapped = <T extends { x: number }>(spots: (plan: VillagePlan) => readonly T[]): T[] =>
    plans.flatMap(spots).map((spot) => ({ ...spot, x: wrapPhase(spot.x, SCENERY.villagePeriod) }));
  return {
    houses: wrapped((plan) => plan.houses),
    yards: wrapped((plan) => plan.yards),
    trees: wrapped((plan) => plan.trees),
  };
}
