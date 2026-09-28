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
  shadedCellCount,
  shadedShareOfRow,
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
  it('covers the bottom row first and partially', () => {
    const layout = LAYOUTS.halfCut;
    expect(shadedShareOfRow(layout, 17, 0)).toBe(0);
    expect(shadedShareOfRow(layout, 17, 1 / 36)).toBeCloseTo(0.5);
    expect(shadedShareOfRow(layout, 17, 1 / 18)).toBeCloseTo(1);
    expect(shadedShareOfRow(layout, 16, 1 / 18)).toBeCloseTo(0);
    expect(shadedShareOfRow(layout, 0, 1)).toBeCloseTo(1);
  });

  it('counts the cells the shadow touches', () => {
    expect(shadedCellCount(LAYOUTS.halfCut, 0)).toBe(0);
    expect(shadedCellCount(LAYOUTS.halfCut, 0.01)).toBe(6);
    expect(shadedCellCount(LAYOUTS.halfCut, 0.5)).toBe(54);
    expect(shadedCellCount(LAYOUTS.fullCell, 1)).toBe(60);
  });
});
