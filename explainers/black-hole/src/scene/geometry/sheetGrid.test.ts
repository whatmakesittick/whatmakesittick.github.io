import { describe, expect, it } from 'vitest';
import { SHEET, sheetDepth } from '../layout';
import { buildSheetGrid, sheetPoint, sheetRadii, throatGlow } from './sheetGrid';

describe('sheet grid', () => {
  it('spaces the rings from the throat to the rim, denser near the throat', () => {
    const radii = sheetRadii();
    expect(radii).toHaveLength(SHEET.rings + 1);
    expect(radii[0]).toBe(1);
    expect(radii[radii.length - 1]).toBeCloseTo(SHEET.rim, 9);
    expect(radii[1] - radii[0]).toBeLessThan(radii[radii.length - 1] - radii[radii.length - 2]);
  });

  it('puts every point on the paraboloid below the rim', () => {
    const [x, y, z] = sheetPoint(4, Math.PI / 2);
    expect(x).toBeCloseTo(0, 9);
    expect(z).toBeCloseTo(4, 9);
    expect(y).toBeCloseTo(-sheetDepth(4), 9);
    expect(sheetPoint(SHEET.rim, 0)[1]).toBeCloseTo(0, 9);
  });

  it('glows near the throat and fades outward', () => {
    expect(throatGlow(1)).toBe(1);
    expect(throatGlow(SHEET.rim)).toBeLessThan(0.01);
  });

  it('builds rings and spokes as segment pairs without gaps in the numbers', () => {
    const grid = buildSheetGrid(8, 4, [1, 2, 3]);
    const ringPoints = 3 * 8 * 2;
    const spokePoints = 4 * 2 * 2;
    expect(grid.positions).toHaveLength((ringPoints + spokePoints) * 3);
    expect(grid.colors).toHaveLength(grid.positions.length);
    expect(grid.positions.every(Number.isFinite)).toBe(true);
    expect(grid.colors.every((value) => value >= 0 && value <= 1)).toBe(true);
  });
});
