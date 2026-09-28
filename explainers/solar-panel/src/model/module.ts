import { clamp } from '@core/math';
import type { LayoutId } from '../ids';

export const MODULE_SPEC = {
  name: 'JinkoSolar Tiger Neo JKM420N-54HL4-(V)',
  technology: 'n-type TOPCon',
  cells: 108,
  columns: 6,
  rows: 18,
  seriesPositions: 54,
  powerW: 420,
  vocV: 38.11,
  vmpV: 31.51,
  iscA: 14.07,
  impA: 13.33,
  efficiency: 0.215,
  tempCoefficientPower: -0.0029,
  tempCoefficientVoc: -0.0025,
  tempCoefficientIsc: 0.00045,
  noctC: 45,
  roofNoctC: 49,
  lengthMm: 1722,
  widthMm: 1134,
  frameMm: 30,
  glassMm: 3.2,
  weightKg: 22,
  warrantyYears: 30,
  firstYearShare: 0.99,
  degradationPerYear: 0.004,
} as const;

export const STANDARD_TEST = { irradiance: 1000, cellTemperatureC: 25, airMass: 1.5 } as const;
export const NOCT_TEST = { irradiance: 800, ambientC: 20, windMs: 1, powerW: 316 } as const;

export const CELL = {
  edgeMm: 182,
  halfHeightMm: 91,
  gapMm: 2,
  thicknessUm: 140,
  areaCm2: 330.8,
  vocV: 0.706,
  vmpV: 0.584,
  fullIscA: 14.07,
  halfIscA: 7.03,
  halfImpA: 6.67,
  fillFactor: 0.783,
} as const;

export const SINGLE_DIODE_TEACHING = {
  lightCurrentA: 14.08,
  saturationCurrentA: 1.64e-11,
  seriesOhms: 0.172,
  shuntOhms: 281,
  ideality: 1.0,
} as const;

export const SINGLE_DIODE_CURVE = {
  lightCurrentA: 14.08,
  saturationCurrentA: 5.0e-12,
  seriesOhms: 0.182,
  shuntOhms: 230,
  ideality: 0.96,
} as const;

export const THERMAL_VOLTAGE_25C_V = 0.02569;
export const BYPASS_DIODE_DROP_V = 0.45;
export const CELL_BREAKDOWN_V = -15;
export const MODULE_AREA_M2 = (MODULE_SPEC.lengthMm / 1000) * (MODULE_SPEC.widthMm / 1000);

export interface ModuleLayout {
  id: LayoutId;
  columns: number;
  rows: number;
  groups: number;
  stringsPerGroup: number;
  cellsPerString: number;
}

export const LAYOUTS: Record<LayoutId, ModuleLayout> = {
  halfCut: {
    id: 'halfCut',
    columns: 6,
    rows: 18,
    groups: 3,
    stringsPerGroup: 2,
    cellsPerString: 18,
  },
  fullCell: {
    id: 'fullCell',
    columns: 6,
    rows: 10,
    groups: 3,
    stringsPerGroup: 1,
    cellsPerString: 20,
  },
};

export interface CellPosition {
  column: number;
  row: number;
  group: number;
  string: number;
}

const COLUMNS_PER_GROUP = 2;

export function cellCount(layout: ModuleLayout): number {
  return layout.columns * layout.rows;
}

export function stringCount(layout: ModuleLayout): number {
  return layout.groups * layout.stringsPerGroup;
}

export function diodeCount(layout: ModuleLayout): number {
  return layout.groups;
}

export function cellAt(layout: ModuleLayout, column: number, row: number): CellPosition {
  const group = Math.floor(column / COLUMNS_PER_GROUP);
  const rowsPerString = layout.rows / layout.stringsPerGroup;
  const stringInGroup = Math.floor(row / rowsPerString);
  return { column, row, group, string: group * layout.stringsPerGroup + stringInGroup };
}

export function cellsOf(layout: ModuleLayout): CellPosition[] {
  const cells: CellPosition[] = [];
  for (let row = 0; row < layout.rows; row += 1) {
    for (let column = 0; column < layout.columns; column += 1) {
      cells.push(cellAt(layout, column, row));
    }
  }
  return cells;
}

export function groupOfString(layout: ModuleLayout, string: number): number {
  return Math.floor(string / layout.stringsPerGroup);
}

export const SHADE_EDGE_DROP = 1 / 3;

export function shadeEdgeHeight(shade: number, xShare: number): number {
  return shade * (1 + SHADE_EDGE_DROP) - SHADE_EDGE_DROP * xShare;
}

function averageClamped(fromValue: number, toValue: number): number {
  const low = Math.min(fromValue, toValue);
  const high = Math.max(fromValue, toValue);
  if (high <= 0) return 0;
  if (low >= 1) return 1;
  if (high === low) return clamp(low, 0, 1);
  const inner = (Math.min(high, 1) ** 2 - Math.max(low, 0) ** 2) / 2;
  const above = Math.max(0, high - 1);
  return (inner + above) / (high - low);
}

export function shadedShareOfCell(
  layout: ModuleLayout,
  column: number,
  row: number,
  shade: number,
): number {
  const rowHeight = 1 / layout.rows;
  const bottom = 1 - (row + 1) * rowHeight;
  const left = column / layout.columns;
  const right = (column + 1) / layout.columns;
  const coverAt = (xShare: number) => (shadeEdgeHeight(shade, xShare) - bottom) / rowHeight;
  return averageClamped(coverAt(left), coverAt(right));
}

export function shadedCellCount(layout: ModuleLayout, shade: number): number {
  let count = 0;
  for (let row = 0; row < layout.rows; row += 1) {
    for (let column = 0; column < layout.columns; column += 1) {
      if (shadedShareOfCell(layout, column, row, shade) > 0) count += 1;
    }
  }
  return count;
}
