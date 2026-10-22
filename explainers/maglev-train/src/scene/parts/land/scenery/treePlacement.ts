import { CLEAR, GROUND } from '../constants';
import { footprint, landBlocks } from '../ground/blocks';
import type { Block } from '../ground/blocks';
import type { Field } from '../ground/fields';
import { VERGES } from '../ground/linears';
import type { Linear } from '../ground/linears';
import { between, seededRandom } from '../random';
import type { Random, Range } from '../random';
import { COPSES, TREE_ROWS } from './constants';
import type { TreeKind } from './treeGeometry';

export type { TreeKind } from './treeGeometry';

export interface TreeSpot {
  readonly x: number;
  readonly z: number;
  readonly scale: number;
  readonly seed: number;
  readonly kind: TreeKind;
}

const VERGE_SHARE = 0.55;
const HALF = 0.5;

export function isClearOfLine(z: number): boolean {
  return z < CLEAR.left || z > CLEAR.right;
}

function inRange(value: number, [from, to]: Range): boolean {
  return value >= from && value <= to;
}

function rowKind(linear: Linear, random: Random): TreeKind {
  const { kinds } = TREE_ROWS.byKind[linear.kind];
  return kinds[Math.floor(random() * kinds.length)];
}

function blockedBy(
  linears: readonly Linear[],
  axis: Linear['axis'],
  along: number,
  across: number,
) {
  return linears.some((other) => {
    if (other.axis === axis || !inRange(across, other.span)) return false;
    const [from, to] = footprint(other);
    return along > from - TREE_ROWS.crossingClear && along < to + TREE_ROWS.crossingClear;
  });
}

function runStops(span: Range, spacing: Range, random: Random): number[] {
  const stops: number[] = [];
  let along = span[0] + random() * TREE_ROWS.gap[1];
  while (along < span[1]) {
    const runEnd = Math.min(span[1], along + between(random, TREE_ROWS.run));
    for (; along < runEnd; along += between(random, spacing)) stops.push(along);
    along = runEnd + between(random, TREE_ROWS.gap);
  }
  return stops;
}

function rowSides(linear: Linear, random: Random): number[] {
  const { sides } = TREE_ROWS.byKind[linear.kind];
  if (sides === 2) return [-1, 1];
  return [random() < HALF ? -1 : 1];
}

function rowSpots(linear: Linear, linears: readonly Linear[], random: Random): TreeSpot[] {
  const kind = rowKind(linear, random);
  const { spacing } = TREE_ROWS.byKind[linear.kind];
  const offset = linear.width / 2 + VERGES[linear.kind] * VERGE_SHARE;
  return rowSides(linear, random).flatMap((side) => {
    const across = linear.centre + side * offset;
    return runStops(linear.span, spacing, random).flatMap((along): TreeSpot[] => {
      const jitter = side * random() * TREE_ROWS.jitter;
      const [x, z] = linear.axis === 'x' ? [along, across + jitter] : [across + jitter, along];
      const lengthwise = linear.axis === 'x' ? x : z;
      const crosswise = linear.axis === 'x' ? z : x;
      if (!isClearOfLine(z) || Math.abs(z) > TREE_ROWS.reach) return [];
      if (blockedBy(linears, linear.axis, lengthwise, crosswise)) return [];
      return [{ x, z, scale: between(random, TREE_ROWS.scale), seed: random(), kind }];
    });
  });
}

function hasGreenhouse(block: Block, fields: readonly Field[]): boolean {
  return fields.some(
    (field) =>
      field.kind === 'greenhouse' && inRange(field.x[0], block.x) && inRange(field.z[0], block.z),
  );
}

function copse(block: Block, random: Random): TreeSpot[] {
  const { inset, count, radius, scale } = COPSES;
  const atX = random() < 0.5 ? block.x[0] + inset : block.x[1] - inset;
  const atZ = random() < 0.5 ? block.z[0] + inset : block.z[1] - inset;
  const reach = between(random, radius);
  const total = Math.round(between(random, count));
  const spots: TreeSpot[] = [];
  for (let index = 0; index < total; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * reach;
    const x = Math.min(
      block.x[1] - inset,
      Math.max(block.x[0] + inset, atX + Math.cos(angle) * distance),
    );
    const z = Math.min(
      block.z[1] - inset,
      Math.max(block.z[0] + inset, atZ + Math.sin(angle) * distance),
    );
    spots.push({ x, z, scale: between(random, scale), seed: random(), kind: 'round' });
  }
  return spots;
}

function copses(blocks: readonly Block[], fields: readonly Field[], random: Random): TreeSpot[] {
  return blocks
    .filter((block) => {
      const middle = Math.abs((block.z[0] + block.z[1]) / 2);
      const clear = isClearOfLine(block.z[0]) && isClearOfLine(block.z[1]);
      return clear && inRange(middle, COPSES.zRange) && !hasGreenhouse(block, fields);
    })
    .filter(() => random() < COPSES.chance)
    .flatMap((block) => copse(block, random));
}

export function tileTrees(
  linears: readonly Linear[],
  fields: readonly Field[],
  blocks: readonly Block[] = landBlocks(linears),
): TreeSpot[] {
  const rows = seededRandom(TREE_ROWS.seed);
  const rowTrees = linears.flatMap((linear) => rowSpots(linear, linears, rows));
  const copseTrees = copses(blocks, fields, seededRandom(COPSES.seed));
  return [...rowTrees, ...copseTrees].map((spot) => ({
    ...spot,
    x: ((spot.x % GROUND.period) + GROUND.period) % GROUND.period,
  }));
}
