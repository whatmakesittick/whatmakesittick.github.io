import { FULL_TURN, clamp } from '@core/math';
import { wrapPhase } from '@core/store';
import { SIDE_SIGNS } from '../../../../model';
import { CLEAR, GROUND } from '../constants';
import { footprint, landBlocks } from '../ground/blocks';
import type { Block } from '../ground/blocks';
import type { Field } from '../ground/fields';
import { VERGES } from '../ground/linears';
import type { Linear } from '../ground/linears';
import { between, middle, pick, seededRandom, shrunk } from '../random';
import type { Random, Range } from '../random';
import { COPSES, LOW_BAND, TREE_ROWS } from './constants';
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

export function isNearLine(z: number): boolean {
  return Math.abs(z) < LOW_BAND.reach;
}

export function isBandFarFromLine([from, to]: Range): boolean {
  return from * to > 0 && Math.min(Math.abs(from), Math.abs(to)) >= LOW_BAND.reach;
}

function lowered(spot: TreeSpot, random: Random): TreeSpot[] {
  if (!isNearLine(spot.z)) return [spot];
  if (random() > LOW_BAND.keep) return [];
  return [{ ...spot, kind: 'round', scale: between(random, LOW_BAND.scale) }];
}

export function isClearOfLine(z: number): boolean {
  return z < CLEAR.left || z > CLEAR.right;
}

function inRange(value: number, [from, to]: Range): boolean {
  return value >= from && value <= to;
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

function rowSides(linear: Linear, random: Random): readonly number[] {
  if (TREE_ROWS.byKind[linear.kind].sides === 2) return SIDE_SIGNS;
  return [pick(random, SIDE_SIGNS)];
}

function rowSpots(linear: Linear, linears: readonly Linear[], random: Random): TreeSpot[] {
  const { spacing, kinds } = TREE_ROWS.byKind[linear.kind];
  const kind: TreeKind = pick(random, kinds);
  const offset = linear.width / 2 + VERGES[linear.kind] * VERGE_SHARE;
  return rowSides(linear, random).flatMap((side) => {
    const across = linear.centre + side * offset;
    return runStops(linear.span, spacing, random).flatMap((along): TreeSpot[] => {
      const crosswise = across + side * random() * TREE_ROWS.jitter;
      const [x, z] = linear.axis === 'x' ? [along, crosswise] : [crosswise, along];
      if (!isClearOfLine(z) || Math.abs(z) > TREE_ROWS.reach) return [];
      if (blockedBy(linears, linear.axis, along, crosswise)) return [];
      return lowered(
        { x, z, scale: between(random, TREE_ROWS.scale), seed: random(), kind },
        random,
      );
    });
  });
}

function hasGreenhouse(block: Block, fields: readonly Field[]): boolean {
  return fields.some(
    (field) =>
      field.kind === 'greenhouse' && inRange(field.x[0], block.x) && inRange(field.z[0], block.z),
  );
}

export function isOpenBlock(block: Block, fields: readonly Field[], reach: number): boolean {
  const far = isBandFarFromLine(block.z) && Math.abs(middle(block.z)) <= reach;
  return far && !hasGreenhouse(block, fields);
}

function copse(block: Block, random: Random): TreeSpot[] {
  const { inset, count, radius, scale } = COPSES;
  const xs = shrunk(block.x, inset);
  const zs = shrunk(block.z, inset);
  const atX = pick(random, xs);
  const atZ = pick(random, zs);
  const reach = between(random, radius);
  return Array.from({ length: Math.round(between(random, count)) }, (): TreeSpot => {
    const angle = random() * FULL_TURN;
    const distance = Math.sqrt(random()) * reach;
    return {
      x: clamp(atX + Math.cos(angle) * distance, ...xs),
      z: clamp(atZ + Math.sin(angle) * distance, ...zs),
      scale: between(random, scale),
      seed: random(),
      kind: 'round',
    };
  });
}

function copses(blocks: readonly Block[], fields: readonly Field[], random: Random): TreeSpot[] {
  return blocks
    .filter((block) => isOpenBlock(block, fields, COPSES.reach))
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
    x: wrapPhase(spot.x, GROUND.period),
  }));
}
