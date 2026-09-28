import { describe, expect, it } from 'vitest';
import { LAYOUTS, MODULE } from '../../model';
import { CELL_WIDTH_CM, GRID, cellHeight, cellRect, cellRects, sliceCorner } from './moduleLayout';

describe('module layout', () => {
  it('fits the half-cut grid inside the module with the real cell size', () => {
    expect(GRID.x[1] - GRID.x[0]).toBeCloseTo(110.2, 5);
    expect(GRID.y[1] - GRID.y[0]).toBeCloseTo(167.2, 5);
    expect(GRID.y[0]).toBeGreaterThan(0);
    expect(GRID.y[1]).toBeLessThan(MODULE.height);
    expect(cellHeight(LAYOUTS.halfCut)).toBeCloseTo(9.1, 5);
    expect(CELL_WIDTH_CM).toBeCloseTo(18.2, 5);
  });

  it('draws the full-cell layout in the same outline', () => {
    const first = cellRect(LAYOUTS.fullCell, 0, 0);
    const last = cellRect(LAYOUTS.fullCell, 5, 9);
    expect(first.y[1]).toBeCloseTo(GRID.y[1], 5);
    expect(last.y[0]).toBeCloseTo(GRID.y[0], 5);
    expect(last.x[1]).toBeCloseTo(GRID.x[1], 5);
  });

  it('puts row 0 at the top and carries the wiring of each cell', () => {
    const rects = cellRects(LAYOUTS.halfCut);
    expect(rects).toHaveLength(108);
    expect(rects[0].y[0]).toBeGreaterThan(rects[rects.length - 1].y[1]);
    const lower = cellRect(LAYOUTS.halfCut, 3, 12);
    expect(lower.group).toBe(1);
    expect(lower.string).toBe(3);
  });

  it('places the slice at the top left cell corner, west and high', () => {
    const corner = sliceCorner();
    expect(corner.x).toBeLessThan(0);
    expect(corner.y).toBeCloseTo(GRID.y[1], 5);
  });
});
