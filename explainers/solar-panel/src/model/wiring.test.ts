import { describe, expect, it } from 'vitest';
import type { CellPosition, ModuleLayout } from './module';
import { CELL_BREAKDOWN_V, LAYOUTS, MODULE_SPEC } from './module';
import {
  IV_SAMPLES,
  analyseShade,
  bandShading,
  cellParameters,
  cellVoltage,
  ivCurve,
  maximumPowerPoint,
  moduleCircuit,
} from './wiring';

const { halfCut, fullCell } = LAYOUTS;

function oneCellAtTheBottom(layout: ModuleLayout, share: number) {
  return (cell: CellPosition) => (cell.column === 0 && cell.row === layout.rows - 1 ? share : 0);
}

function bottomRow(layout: ModuleLayout, share: number) {
  return (cell: CellPosition) => (cell.row === layout.rows - 1 ? share : 0);
}

function keptShare(layout: ModuleLayout, shade: Parameters<typeof analyseShade>[1]): number {
  const analysis = analyseShade(layout, shade, 1000, 25);
  return analysis.maximum.power / analysis.clearMaximum.power;
}

function peakPower(irradiance: number, cellTemperatureC: number): number {
  return maximumPowerPoint(moduleCircuit(halfCut, 0, irradiance, cellTemperatureC).sweep).power;
}

describe('one cell', () => {
  it('gives about 0.7 V open and runs backwards down to the breakdown when starved', () => {
    const cell = cellParameters(halfCut, 1000, 25);
    expect(cell.photocurrent).toBeCloseTo(7.04, 2);
    expect(cellVoltage(0, cell)).toBeCloseTo(0.707, 2);
    expect(cellVoltage(6.67, cell)).toBeGreaterThan(0.5);
    const dark = { ...cell, photocurrent: 0 };
    expect(cellVoltage(0.1, dark)).toBeLessThan(0);
    expect(cellVoltage(7, dark)).toBe(CELL_BREAKDOWN_V);
  });

  it('shares the module current between the two halves of a half cut position', () => {
    const half = cellParameters(halfCut, 1000, 25);
    const full = cellParameters(fullCell, 1000, 25);
    expect(half.photocurrent * 2).toBeCloseTo(14.08, 2);
    expect(full.photocurrent).toBeCloseTo(14.08 * (54 / 60), 2);
  });
});

describe('the clear module', () => {
  it('matches the datasheet in test sun (facts section 1)', () => {
    const circuit = moduleCircuit(halfCut, 0, 1000, 25);
    const peak = maximumPowerPoint(circuit.sweep);
    expect(peak.power).toBeCloseTo(MODULE_SPEC.powerW, -1);
    expect(peak.voltage).toBeCloseTo(MODULE_SPEC.vmpV, 0);
    expect(peak.current).toBeCloseTo(MODULE_SPEC.impA, 1);
    const curve = ivCurve(circuit);
    expect(curve).toHaveLength(IV_SAMPLES);
    expect(curve[0]).toMatchObject({ voltage: 0 });
    expect(curve[0].current).toBeCloseTo(MODULE_SPEC.iscA, 1);
    expect(curve.at(-1)?.voltage).toBeCloseTo(MODULE_SPEC.vocV, 0);
    expect(curve.at(-1)?.current).toBeCloseTo(0, 1);
  });

  it('follows the single-diode temperature table (facts section 6)', () => {
    expect(peakPower(1000, 0)).toBeCloseTo(451, -1);
    expect(peakPower(1000, 50)).toBeCloseTo(388, -1);
    expect(peakPower(1000, 75)).toBeCloseTo(356, -1);
  });

  it('follows the irradiance table and the NOCT rating (facts sections 1 and 8)', () => {
    expect(peakPower(500, 25)).toBeCloseTo(212, -1);
    expect(peakPower(200, 25)).toBeCloseTo(84, 0);
    expect(peakPower(800, 45)).toBeCloseTo(316, -1);
  });

  it('draws nothing in the dark', () => {
    const circuit = moduleCircuit(halfCut, 0, 0, 20);
    expect(ivCurve(circuit)).toEqual([]);
    expect(maximumPowerPoint(circuit.sweep).power).toBe(0);
  });
});

describe('shading (facts section 7)', () => {
  it('costs about a third for one fully shaded cell on both layouts', () => {
    expect(keptShare(halfCut, oneCellAtTheBottom(halfCut, 1))).toBeCloseTo(0.65, 1);
    expect(keptShare(fullCell, oneCellAtTheBottom(fullCell, 1))).toBeCloseTo(0.654, 1);
  });

  it('keeps about 82 percent with one half cell half shaded against 65 for a full cell', () => {
    expect(keptShare(halfCut, oneCellAtTheBottom(halfCut, 0.5))).toBeCloseTo(0.823, 1);
    expect(keptShare(fullCell, oneCellAtTheBottom(fullCell, 0.5))).toBeCloseTo(0.654, 1);
  });

  it('keeps half the power with the bottom row shaded on the half cut panel and almost none on the full cell one', () => {
    expect(keptShare(halfCut, bottomRow(halfCut, 1))).toBeCloseTo(0.503, 1);
    expect(keptShare(fullCell, bottomRow(fullCell, 1))).toBeLessThan(0.05);
  });

  it('matches the partly shaded bottom row', () => {
    expect(keptShare(halfCut, bottomRow(halfCut, 0.5))).toBeCloseTo(0.767, 1);
    expect(keptShare(fullCell, bottomRow(fullCell, 0.5))).toBeCloseTo(0.577, 1);
  });

  it('creeps in from the bottom left corner along a tilted edge', () => {
    const shading = bandShading(halfCut, 0.03);
    expect(shading({ column: 0, row: 17, group: 0, string: 1 })).toBeGreaterThan(0.2);
    expect(shading({ column: 1, row: 17, group: 0, string: 1 })).toBe(0);
    expect(shading({ column: 0, row: 16, group: 0, string: 1 })).toBe(0);
    expect(keptShare(halfCut, 0.03)).toBeGreaterThan(0.8);
    expect(keptShare(halfCut, 0.09)).toBeCloseTo(0.65, 1);
    expect(keptShare(fullCell, 0.09)).toBeCloseTo(0.65, 1);
    expect(keptShare(halfCut, 0.35)).toBeCloseTo(0.503, 1);
    expect(keptShare(fullCell, 0.35)).toBeLessThan(0.05);
  });
});

describe('strings and diodes', () => {
  it('switches on the diode of the shaded third and drops its strings', () => {
    const analysis = analyseShade(halfCut, oneCellAtTheBottom(halfCut, 1), 1000, 25);
    expect(analysis.activeDiodes).toEqual([true, false, false]);
    expect(analysis.deadStrings).toEqual([true, true, false, false, false, false]);
  });

  it('keeps the upper strings of the half cut panel running under a low shadow', () => {
    const analysis = analyseShade(halfCut, 0.35, 900, 45);
    expect(analysis.activeDiodes).toEqual([false, false, false]);
    expect(analysis.deadStrings).toEqual([false, true, false, true, false, true]);
  });

  it('keeps every string running in full sun', () => {
    const analysis = analyseShade(fullCell, 0, 1000, 25);
    expect(analysis.deadStrings).toEqual([false, false, false]);
    expect(analysis.activeDiodes).toEqual([false, false, false]);
    expect(analysis.maximum.power).toBeCloseTo(analysis.clearMaximum.power);
  });

  it('stops every string when the panel is covered or dark', () => {
    expect(analyseShade(halfCut, 1, 1000, 25).deadStrings.every(Boolean)).toBe(true);
    const night = analyseShade(fullCell, 0, 0, 12);
    expect(night.deadStrings).toEqual([true, true, true]);
    expect(night.activeDiodes).toEqual([false, false, false]);
    expect(night.curve).toEqual([]);
  });
});
