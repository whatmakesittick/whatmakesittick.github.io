import { Vector2 } from 'three';
import { containsPoint } from './cap';

export type Field2 = (x: number, y: number) => number;

export interface ContourGrid {
  readonly min: readonly [number, number];
  readonly max: readonly [number, number];
  readonly cell: number;
}

export interface NestedLoops {
  readonly outers: Vector2[][];
  readonly holes: Vector2[][];
}

const EDGES_PER_CELL = 4;
const MIN_LOOP_POINTS = 3;
const COARSE_STRIDE = 4;
const BAND_SHARE = 1.5;

const SEGMENTS: readonly (readonly [number, number][])[] = [
  [],
  [[3, 0]],
  [[0, 1]],
  [[3, 1]],
  [[1, 2]],
  [
    [3, 0],
    [1, 2],
  ],
  [[0, 2]],
  [[3, 2]],
  [[2, 3]],
  [[2, 0]],
  [
    [0, 1],
    [2, 3],
  ],
  [[2, 1]],
  [[1, 3]],
  [[1, 0]],
  [[0, 3]],
  [],
];

function coarseValues(field: Field2, grid: ContourGrid, columns: number, rows: number) {
  const coarseColumns = Math.ceil(columns / COARSE_STRIDE) + 1;
  const coarseRows = Math.ceil(rows / COARSE_STRIDE) + 1;
  const values = new Float64Array(coarseColumns * coarseRows);
  for (let row = 0; row < coarseRows; row += 1) {
    for (let column = 0; column < coarseColumns; column += 1) {
      values[row * coarseColumns + column] = field(
        grid.min[0] + column * COARSE_STRIDE * grid.cell,
        grid.min[1] + row * COARSE_STRIDE * grid.cell,
      );
    }
  }
  return (column: number, row: number): number => {
    const fc = column / COARSE_STRIDE;
    const fr = row / COARSE_STRIDE;
    const c0 = Math.min(Math.floor(fc), coarseColumns - 2);
    const r0 = Math.min(Math.floor(fr), coarseRows - 2);
    const tc = fc - c0;
    const tr = fr - r0;
    const at = (c: number, r: number) => values[r * coarseColumns + c];
    const bottom = at(c0, r0) * (1 - tc) + at(c0 + 1, r0) * tc;
    const top = at(c0, r0 + 1) * (1 - tc) + at(c0 + 1, r0 + 1) * tc;
    return bottom * (1 - tr) + top * tr;
  };
}

function sampleGrid(
  field: Field2,
  grid: ContourGrid,
): { values: Float64Array; columns: number; rows: number } {
  const columns = Math.ceil((grid.max[0] - grid.min[0]) / grid.cell) + 1;
  const rows = Math.ceil((grid.max[1] - grid.min[1]) / grid.cell) + 1;
  const values = new Float64Array(columns * rows);
  const estimate = coarseValues(field, grid, columns, rows);
  const band = BAND_SHARE * COARSE_STRIDE * grid.cell * Math.SQRT2;
  for (let row = 0; row < rows; row += 1) {
    const y = grid.min[1] + row * grid.cell;
    for (let column = 0; column < columns; column += 1) {
      const inside = row > 0 && row < rows - 1 && column > 0 && column < columns - 1;
      if (!inside) {
        values[row * columns + column] = 1;
        continue;
      }
      const guess = estimate(column, row);
      values[row * columns + column] =
        Math.abs(guess) > band ? guess : field(grid.min[0] + column * grid.cell, y);
    }
  }
  return { values, columns, rows };
}

export function contourLoops(field: Field2, grid: ContourGrid): Vector2[][] {
  const { values, columns, rows } = sampleGrid(field, grid);
  const at = (column: number, row: number) => values[row * columns + column];
  const edgeKey = (column: number, row: number, edge: number): number => {
    if (edge === 2) return ((row + 1) * columns + column) * 2;
    if (edge === 1) return (row * columns + column + 1) * 2 + 1;
    if (edge === 3) return (row * columns + column) * 2 + 1;
    return (row * columns + column) * 2;
  };
  const points = new Map<number, Vector2>();
  const pointOn = (column: number, row: number, edge: number): number => {
    const key = edgeKey(column, row, edge);
    if (!points.has(key)) {
      const corners = [
        [column, row],
        [column + 1, row],
        [column + 1, row + 1],
        [column, row + 1],
      ];
      const [a, b] = [corners[edge], corners[(edge + 1) % EDGES_PER_CELL]];
      const va = at(a[0], a[1]);
      const vb = at(b[0], b[1]);
      const share = va / (va - vb);
      points.set(
        key,
        new Vector2(
          grid.min[0] + (a[0] + (b[0] - a[0]) * share) * grid.cell,
          grid.min[1] + (a[1] + (b[1] - a[1]) * share) * grid.cell,
        ),
      );
    }
    return key;
  };
  const next = new Map<number, number>();
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const index =
        (at(column, row) < 0 ? 1 : 0) |
        (at(column + 1, row) < 0 ? 2 : 0) |
        (at(column + 1, row + 1) < 0 ? 4 : 0) |
        (at(column, row + 1) < 0 ? 8 : 0);
      for (const [from, to] of SEGMENTS[index]) {
        next.set(pointOn(column, row, from), pointOn(column, row, to));
      }
    }
  }
  return chain(next, points);
}

function chain(next: Map<number, number>, points: Map<number, Vector2>): Vector2[][] {
  const loops: Vector2[][] = [];
  const visited = new Set<number>();
  for (const start of next.keys()) {
    if (visited.has(start)) continue;
    const loop: Vector2[] = [];
    let key: number | undefined = start;
    while (key !== undefined && !visited.has(key)) {
      visited.add(key);
      const point = points.get(key);
      if (point) loop.push(point);
      key = next.get(key);
    }
    if (key === start && loop.length >= MIN_LOOP_POINTS) loops.push(loop);
  }
  return loops;
}

export function nestLoops(loops: readonly Vector2[][]): NestedLoops {
  const outers: Vector2[][] = [];
  const holes: Vector2[][] = [];
  loops.forEach((loop, index) => {
    const depth = loops.filter(
      (other, otherIndex) => otherIndex !== index && containsPoint(other, loop[0]),
    ).length;
    (depth % 2 === 0 ? outers : holes).push(loop);
  });
  return { outers, holes };
}
