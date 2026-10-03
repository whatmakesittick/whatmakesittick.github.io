import { clamp } from '@core/math';
import { SLIPWAY } from '../../model/layout';
import type { Range } from './shoreTerrain';
import { SLIPWAY_WORKS, shoreHeight } from './shoreTerrain';

export interface TerrainGrid {
  xs: readonly number[];
  zs: readonly number[];
  heights: Float32Array;
}

export const SHORE_GRID = {
  extent: { x: [-1200, 640] as Range, z: [-2500, 2500] as Range },
  fine: { x: [-100, 8] as Range, z: [-84, 24] as Range },
  cell: 2.4,
  growth: { x: [1.27, 1.45] as Range, z: [1.27, 1.27] as Range },
  clearance: 0.3,
} as const;

const EPSILON = 1e-6;

function outwardLines(start: number, limit: number, step: number, growth: number): number[] {
  const lines: number[] = [];
  const direction = Math.sign(limit - start);
  for (
    let size = step * growth, value = start + direction * size;
    direction * (limit - value) > EPSILON;
    size *= growth, value += direction * size
  ) {
    lines.push(value);
  }
  return lines;
}

export function gridLines(
  extent: Range,
  fine: Range,
  cell: number,
  growth: Range,
  keep: readonly number[] = [],
): number[] {
  const inner: number[] = [];
  for (let value = fine[0]; value <= fine[1] + EPSILON; value += cell) inner.push(value);
  const base = [
    ...outwardLines(fine[0], extent[0], cell, growth[0]),
    ...inner,
    ...outwardLines(inner[inner.length - 1], extent[1], cell, growth[1]),
  ];
  const clear = cell * SHORE_GRID.clearance;
  const spaced = base.filter((line) => keep.every((kept) => Math.abs(kept - line) > clear));
  return [...new Set([extent[0], ...spaced, ...keep, extent[1]])].sort((a, b) => a - b);
}

function slipwayBreaks(edges: readonly number[], inward: readonly number[]): number[] {
  const { edgeGap, innerInset } = SLIPWAY_WORKS;
  return edges.flatMap((edge, index) => [
    edge - inward[index] * edgeGap,
    edge + inward[index] * innerInset,
  ]);
}

export function terrainLines(): { xs: number[]; zs: number[] } {
  const { extent, fine, cell, growth } = SHORE_GRID;
  const { apron } = SLIPWAY_WORKS;
  const xBreaks = slipwayBreaks([apron.x[0], SLIPWAY.x[1]], [1, -1]);
  const zBreaks = slipwayBreaks(
    [SLIPWAY.z[0], SLIPWAY.z[1], apron.z[0], apron.z[1]],
    [1, -1, 1, -1],
  );
  return {
    xs: gridLines(extent.x, fine.x, cell, growth.x, xBreaks),
    zs: gridLines(extent.z, fine.z, cell, growth.z, zBreaks),
  };
}

export function terrainGrid(): TerrainGrid {
  const { xs, zs } = terrainLines();
  const heights = new Float32Array(xs.length * zs.length);
  zs.forEach((z, row) =>
    xs.forEach((x, column) => {
      heights[row * xs.length + column] = shoreHeight(x, z);
    }),
  );
  return { xs, zs, heights };
}

function cellIndex(lines: readonly number[], value: number): number {
  let low = 0;
  let high = lines.length - 2;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (lines[middle] <= value) low = middle;
    else high = middle - 1;
  }
  return low;
}

export function gridHeight(grid: TerrainGrid, x: number, z: number): number {
  const { xs, zs, heights } = grid;
  const column = cellIndex(xs, x);
  const row = cellIndex(zs, z);
  const s = clamp((x - xs[column]) / (xs[column + 1] - xs[column]), 0, 1);
  const t = clamp((z - zs[row]) / (zs[row + 1] - zs[row]), 0, 1);
  const at = (dx: number, dz: number) => heights[(row + dz) * xs.length + column + dx];
  if (s + t <= 1) return at(0, 0) + s * (at(1, 0) - at(0, 0)) + t * (at(0, 1) - at(0, 0));
  return at(1, 1) + (1 - s) * (at(0, 1) - at(1, 1)) + (1 - t) * (at(1, 0) - at(1, 1));
}
