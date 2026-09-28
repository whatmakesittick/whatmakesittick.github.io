import { describe, expect, it } from 'vitest';
import {
  CELL,
  LAYOUTS,
  MODULE_AREA_M2,
  MODULE_SPEC,
  cellAt,
  cellCount,
  cellsOf,
  diodeCount,
  groupOfString,
  SHADE_EDGE_DROP,
  shadeEdgeHeight,
  shadedCellCount,
  shadedShareOfCell,
  stringCount,
} from './module';

describe('MODULE_SPEC', () => {
  it('is consistent with its own datasheet', () => {
    expect(MODULE_SPEC.columns * MODULE_SPEC.rows).toBe(MODULE_SPEC.cells);
    expect(MODULE_SPEC.vmpV * MODULE_SPEC.impA).toBeCloseTo(MODULE_SPEC.powerW, 0);
    expect(MODULE_SPEC.powerW / MODULE_AREA_M2 / 1000).toBeCloseTo(MODULE_SPEC.efficiency, 2);
    expect(MODULE_SPEC.vocV / MODULE_SPEC.seriesPositions).toBeCloseTo(CELL.vocV, 2);
    expect(MODULE_SPEC.iscA / 2).toBeCloseTo(CELL.halfIscA, 1);
    expect(MODULE_SPEC.powerW / (MODULE_SPEC.vocV * MODULE_SPEC.iscA)).toBeCloseTo(
      CELL.fillFactor,
      2,
    );
  });
});

describe('layouts', () => {
  it('wires the half-cut module as three groups of two parallel strings of eighteen', () => {
    const layout = LAYOUTS.halfCut;
    expect(cellCount(layout)).toBe(108);
    expect(stringCount(layout)).toBe(6);
    expect(diodeCount(layout)).toBe(3);
    expect(layout.groups * layout.cellsPerString).toBe(MODULE_SPEC.seriesPositions);
    expect(cellAt(layout, 0, 0)).toEqual({ column: 0, row: 0, group: 0, string: 0 });
    expect(cellAt(layout, 1, 8).string).toBe(0);
    expect(cellAt(layout, 1, 9).string).toBe(1);
    expect(cellAt(layout, 5, 17)).toEqual({ column: 5, row: 17, group: 2, string: 5 });
    expect(groupOfString(layout, 3)).toBe(1);
  });

  it('wires the sixty cell module as three strings of twenty', () => {
    const layout = LAYOUTS.fullCell;
    expect(cellCount(layout)).toBe(60);
    expect(stringCount(layout)).toBe(3);
    expect(cellAt(layout, 2, 9).string).toBe(1);
    expect(cellsOf(layout).filter((cell) => cell.string === 2)).toHaveLength(20);
  });

  it('lists every cell once', () => {
    const cells = cellsOf(LAYOUTS.halfCut);
    expect(cells).toHaveLength(108);
    expect(new Set(cells.map((cell) => `${cell.column}:${cell.row}`)).size).toBe(108);
  });
});

describe('shade band', () => {
  const layout = LAYOUTS.halfCut;

  it('has a top edge that drops one half cell per column from left to right', () => {
    expect(shadeEdgeHeight(0, 0)).toBe(0);
    expect(shadeEdgeHeight(0, 1)).toBeCloseTo(-SHADE_EDGE_DROP);
    expect(shadeEdgeHeight(1, 1)).toBeCloseTo(1);
    expect(shadeEdgeHeight(1, 0)).toBeGreaterThan(1);
  });

  it('shades the bottom left cell first and the whole bottom row by a third', () => {
    expect(shadedShareOfCell(layout, 0, 17, 0)).toBe(0);
    expect(shadedShareOfCell(layout, 0, 17, 0.03)).toBeGreaterThan(0.2);
    expect(shadedShareOfCell(layout, 1, 17, 0.03)).toBe(0);
    expect(shadedShareOfCell(layout, 0, 17, 0.09)).toBeCloseTo(1);
    expect(shadedShareOfCell(layout, 2, 17, 0.08)).toBe(0);
    expect(shadedShareOfCell(layout, 5, 17, 0.3)).toBeCloseTo(1);
    expect(shadedShareOfCell(layout, 0, 16, 0.03)).toBe(0);
    expect(shadedShareOfCell(layout, 0, 0, 1)).toBeCloseTo(1);
    expect(shadedShareOfCell(layout, 5, 0, 1)).toBeCloseTo(1);
  });

  it('covers the whole bottom row while the upper strings stay clear', () => {
    for (let column = 0; column < layout.columns; column += 1) {
      expect(shadedShareOfCell(layout, column, 17, 0.35)).toBeCloseTo(1);
      expect(shadedShareOfCell(layout, column, 8, 0.35)).toBe(0);
    }
  });

  it('counts the cells the shadow touches', () => {
    expect(shadedCellCount(layout, 0)).toBe(0);
    expect(shadedCellCount(layout, 0.02)).toBe(1);
    expect(shadedCellCount(layout, 0.35)).toBeGreaterThan(30);
    expect(shadedCellCount(layout, 0.35)).toBeLessThan(54);
    expect(shadedCellCount(LAYOUTS.fullCell, 1)).toBe(60);
  });
});
