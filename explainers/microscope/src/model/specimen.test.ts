import { describe, expect, it } from 'vitest';
import { CHEEK_CELL, cellDensity, cellsInWindow } from './specimen';

const FIELD = { centerX: 0, centerY: 0, size: 2000 };

describe('cheek cell smear', () => {
  it('draws the same cells every time', () => {
    expect(cellsInWindow(FIELD)).toEqual(cellsInWindow(FIELD));
  });

  it('sizes cells 50 to 60 µm across with 7 to 10 µm nuclei', () => {
    cellsInWindow(FIELD).forEach((cell) => {
      expect(cell.radius * 2).toBeGreaterThanOrEqual(50);
      expect(cell.radius * 2).toBeLessThanOrEqual(60);
      expect(cell.nucleus.radius * 2).toBeGreaterThanOrEqual(7);
      expect(cell.nucleus.radius * 2).toBeLessThanOrEqual(10);
      expect(Math.hypot(cell.nucleus.x - cell.x, cell.nucleus.y - cell.y)).toBeLessThan(
        cell.radius * CHEEK_CELL.nucleusShift + 1e-9,
      );
    });
  });

  it('keeps only the cells that reach into the window', () => {
    const window = { centerX: 300, centerY: -200, size: 200 };
    const reach = window.size / 2 + CHEEK_CELL.radius.max * (1 + CHEEK_CELL.outlineWobble);
    const cells = cellsInWindow(window);
    expect(cells.length).toBeGreaterThan(0);
    cells.forEach((cell) => {
      expect(Math.abs(cell.x - window.centerX)).toBeLessThanOrEqual(reach);
      expect(Math.abs(cell.y - window.centerY)).toBeLessThanOrEqual(reach);
    });
  });

  it('clumps cells on one side so an inverted image reads as turned round', () => {
    expect(cellDensity(-420, 260)).toBeGreaterThan(cellDensity(420, -260) * 2);
    const count = (centerX: number, centerY: number) =>
      cellsInWindow({ centerX, centerY, size: 600 }).length;
    expect(count(-420, 260)).toBeGreaterThan(count(420, -260));
  });
});
