import { GROUND, SCENERY } from '../constants';
import type { Block } from '../ground/blocks';
import type { Field } from '../ground/fields';
import { between, seededRandom, weighted } from '../random';
import type { Random, Range } from '../random';
import { VILLAGES } from './constants';
import { isClearOfLine } from './treePlacement';
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

function size([from, to]: Range): number {
  return to - from;
}

function fits(block: Block, fields: readonly Field[]): boolean {
  const middle = Math.abs((block.z[0] + block.z[1]) / 2);
  const [minLength, minDepth] = VILLAGES.minSize;
  const roomy =
    size(block.x) > minLength + VILLAGES.inset * 2 && size(block.z) > minDepth + VILLAGES.inset * 2;
  const clear = isClearOfLine(block.z[0]) && isClearOfLine(block.z[1]);
  const inZone = middle >= VILLAGES.zRange[0] && middle <= VILLAGES.zRange[1];
  const greenhouse = fields.some(
    (field) =>
      field.kind === 'greenhouse' &&
      field.x[0] >= block.x[0] &&
      field.x[1] <= block.x[1] &&
      field.z[0] >= block.z[0] &&
      field.z[1] <= block.z[1],
  );
  return roomy && clear && inZone && !greenhouse;
}

function placeWithin(range: Range, length: number, random: Random): Range {
  const start = range[0] + VILLAGES.inset + random() * (size(range) - length - VILLAGES.inset * 2);
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
  const angle = random() * Math.PI * 2;
  const reach = Math.max(spot.length, spot.depth) / 2 + between(random, VILLAGES.treeOffset);
  return {
    x: spot.x + Math.cos(angle) * reach,
    z: spot.z + Math.sin(angle) * reach,
    scale: between(random, TREE_SCALE),
    seed: random(),
    kind: 'round',
  };
}

function clampTo(value: number, [from, to]: Range): number {
  return Math.min(to - VILLAGES.inset, Math.max(from + VILLAGES.inset, value));
}

function insideBlock(tree: TreeSpot, block: Block, shift: number): TreeSpot {
  return { ...tree, x: clampTo(tree.x - shift, block.x) + shift, z: clampTo(tree.z, block.z) };
}

function village(block: Block, shift: number, random: Random): VillagePlan {
  const [maxLength, maxDepth] = VILLAGES.maxSize;
  const length = Math.min(maxLength, size(block.x) - VILLAGES.inset * 2);
  const depth = Math.min(maxDepth, size(block.z) - VILLAGES.inset * 2);
  const x = placeWithin(block.x, length, random);
  const z = placeWithin(block.z, depth, random);
  const houses: HouseSpot[] = [];
  for (
    let atZ = z[0] + VILLAGES.rowPitch[0] / 2;
    atZ + VILLAGES.rowPitch[0] / 2 <= z[1];
    atZ += between(random, VILLAGES.rowPitch)
  )
    for (
      let atX = x[0] + VILLAGES.housePitch[0] / 2;
      atX + VILLAGES.housePitch[0] / 2 <= x[1];
      atX += between(random, VILLAGES.housePitch)
    )
      if (random() < VILLAGES.houseChance) houses.push(house(atX + shift, atZ, random));
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
  const period = SCENERY.villagePeriod;
  const wrap = <T extends { x: number }>(spot: T): T => ({
    ...spot,
    x: ((spot.x % period) + period) % period,
  });
  return {
    houses: plans.flatMap((plan) => plan.houses).map(wrap),
    yards: plans.flatMap((plan) => plan.yards).map(wrap),
    trees: plans.flatMap((plan) => plan.trees).map(wrap),
  };
}
