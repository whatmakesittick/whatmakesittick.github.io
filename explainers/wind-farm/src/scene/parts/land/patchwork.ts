import { lerp } from '@core/math';
import { hash2 } from './random';

export interface PatchworkLayout {
  readonly cell: readonly [width: number, length: number];
  readonly lengthSpread: readonly [number, number];
  readonly angle: number;
  readonly warp: number;
  readonly warpWave: number;
  readonly splitShare: number;
  readonly woodShare: number;
  readonly hedgeShare: number;
  readonly seed: number;
}

export interface PatchSample {
  field: number;
  tone: number;
  across: number;
  wood: boolean;
  edge: number;
  hedge: boolean;
}

const KEYS = {
  length: 0,
  shift: 1,
  split: 2,
  field: 3,
  tone: 4,
  wood: 5,
  column: 6,
  row: 7,
  line: 8,
};
const WARP_RATIO = 1.37;
const WARP_PHASE = 2;
const HALF = 0.5;

export function createPatchSample(): PatchSample {
  return { field: 0, tone: 0, across: 0, wood: false, edge: 0, hedge: false };
}

function warped(layout: PatchworkLayout, x: number, z: number): [number, number] {
  const cos = Math.cos(layout.angle);
  const sin = Math.sin(layout.angle);
  const u = x * cos + z * sin;
  const v = z * cos - x * sin;
  return [
    u + layout.warp * Math.sin(v / layout.warpWave + layout.seed),
    v + layout.warp * Math.sin(u / (layout.warpWave * WARP_RATIO) + layout.seed * WARP_PHASE),
  ];
}

interface FieldEdges {
  readonly left: number;
  readonly right: number;
  readonly near: number;
  readonly far: number;
}

function boundaryHash(
  seed: number,
  column: number,
  row: number,
  half: number | undefined,
  edges: FieldEdges,
): number {
  const { left, right, near, far } = edges;
  if (Math.min(left, right) >= Math.min(near, far))
    return hash2(column, near < far ? row : row + 1, seed + KEYS.row);
  const towardLeft = left < right;
  if (half !== undefined && towardLeft === (half === 1))
    return hash2(column, row, seed + KEYS.line);
  return hash2(towardLeft ? column : column + 1, KEYS.column, seed);
}

export function samplePatch(
  layout: PatchworkLayout,
  x: number,
  z: number,
  out: PatchSample,
): PatchSample {
  const { seed } = layout;
  const [u, v] = warped(layout, x, z);
  const [width, length] = layout.cell;
  const column = Math.floor(u / width);
  const columnShare = u / width - column;
  const columnLength = length * lerp(...layout.lengthSpread, hash2(column, KEYS.length, seed));
  const shifted = v / columnLength + hash2(column, KEYS.shift, seed);
  const row = Math.floor(shifted);
  const rowShare = shifted - row;
  const split = hash2(column, row, seed + KEYS.split) < layout.splitShare;
  const half = split ? Number(columnShare >= HALF) : undefined;
  const fieldWidth = split ? width * HALF : width;
  const across = half === undefined ? columnShare : (columnShare - half * HALF) / HALF;
  const cell = column + (half ?? 0) * HALF;
  const edges: FieldEdges = {
    left: across * fieldWidth,
    right: (1 - across) * fieldWidth,
    near: rowShare * columnLength,
    far: (1 - rowShare) * columnLength,
  };
  out.field = hash2(cell, row, seed + KEYS.field);
  out.tone = hash2(cell, row, seed + KEYS.tone);
  out.wood = hash2(cell, row, seed + KEYS.wood) < layout.woodShare;
  out.across = across;
  out.edge = Math.min(edges.left, edges.right, edges.near, edges.far);
  out.hedge = boundaryHash(seed, column, row, half, edges) < layout.hedgeShare;
  return out;
}
