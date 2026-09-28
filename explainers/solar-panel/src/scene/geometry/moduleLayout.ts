import type { Extent, ModuleLayout } from '../../model';
import { CELL, MODULE, cellAt, mm } from '../../model';

export const FRAME_WALL_CM = 0.2;
export const FRAME_LIP_THICKNESS_CM = 0.2;

export const CELL_GAP_CM = mm(CELL.gapMm);
export const CELL_WIDTH_CM = mm(CELL.edgeMm);
export const COLUMN_PITCH_CM = CELL_WIDTH_CM + CELL_GAP_CM;
const HALF_CELL_ROWS = 18;
const HALF_CELL_HEIGHT_CM = mm(CELL.halfHeightMm);

export const LAMINATE = {
  width: MODULE.width - 2 * FRAME_WALL_CM,
  height: MODULE.height - 2 * FRAME_WALL_CM,
} as const;

function gridExtent(): { x: Extent; y: Extent } {
  const columns = 6;
  const width = columns * COLUMN_PITCH_CM - CELL_GAP_CM;
  const height = HALF_CELL_ROWS * (HALF_CELL_HEIGHT_CM + CELL_GAP_CM) - CELL_GAP_CM;
  const bottom = (MODULE.height - height) / 2;
  return { x: [-width / 2, width / 2], y: [bottom, bottom + height] };
}

export const GRID = gridExtent();

export interface CellRect {
  column: number;
  row: number;
  group: number;
  string: number;
  x: Extent;
  y: Extent;
}

export function rowPitch(layout: ModuleLayout): number {
  return (GRID.y[1] - GRID.y[0] + CELL_GAP_CM) / layout.rows;
}

export function cellHeight(layout: ModuleLayout): number {
  return rowPitch(layout) - CELL_GAP_CM;
}

export function columnCentre(column: number): number {
  return GRID.x[0] + column * COLUMN_PITCH_CM + CELL_WIDTH_CM / 2;
}

export function rowTop(layout: ModuleLayout, row: number): number {
  return GRID.y[1] - row * rowPitch(layout);
}

export function rowCentre(layout: ModuleLayout, row: number): number {
  return rowTop(layout, row) - cellHeight(layout) / 2;
}

export function cellRect(layout: ModuleLayout, column: number, row: number): CellRect {
  const left = GRID.x[0] + column * COLUMN_PITCH_CM;
  const top = rowTop(layout, row);
  return {
    ...cellAt(layout, column, row),
    x: [left, left + CELL_WIDTH_CM],
    y: [top - cellHeight(layout), top],
  };
}

export function cellRects(layout: ModuleLayout): CellRect[] {
  const rects: CellRect[] = [];
  for (let row = 0; row < layout.rows; row += 1) {
    for (let column = 0; column < layout.columns; column += 1) {
      rects.push(cellRect(layout, column, row));
    }
  }
  return rects;
}

export function sliceCorner(): { x: number; y: number } {
  return { x: GRID.x[0], y: GRID.y[1] };
}
