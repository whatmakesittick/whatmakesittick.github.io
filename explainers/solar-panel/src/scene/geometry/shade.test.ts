import { describe, expect, it } from 'vitest';
import { LAYOUTS, MODULE } from '../../model';
import { FRAME_WALL_CM } from './moduleLayout';
import { cellShadeShare, shadeEdgeFraction, shadePolygon } from './shade';

const layout = LAYOUTS.halfCut;
const BOTTOM = layout.rows - 1;

describe('shade band', () => {
  it('drops a third of the module from the left edge to the right edge', () => {
    expect(shadeEdgeFraction(0.5, 0) - shadeEdgeFraction(0.5, 1)).toBeCloseTo(1 / 3, 9);
    expect(shadeEdgeFraction(1, 1)).toBeCloseTo(1, 9);
  });

  it('shades the bottom left cell first and the whole bottom row by about a third', () => {
    expect(cellShadeShare(layout, 0, BOTTOM, 0.02)).toBeGreaterThan(0);
    expect(cellShadeShare(layout, 5, BOTTOM, 0.02)).toBe(0);
    expect(cellShadeShare(layout, 5, BOTTOM, 0.25)).toBeLessThan(1);
    for (let column = 0; column < layout.columns; column += 1) {
      expect(cellShadeShare(layout, column, BOTTOM, 0.3)).toBe(1);
      expect(cellShadeShare(layout, column, BOTTOM, 0.3 - 0.02)).toBeLessThanOrEqual(1);
    }
    expect(cellShadeShare(layout, 0, 0, 1)).toBe(1);
    expect(cellShadeShare(layout, 5, 0, 1)).toBeCloseTo(1, 9);
    expect(cellShadeShare(layout, 0, 0, 0)).toBe(0);
  });

  it('draws a band inside the laminate whose top edge falls to the east', () => {
    expect(shadePolygon(0)).toHaveLength(0);
    const band = shadePolygon(0.4);
    band.forEach((point) => {
      expect(point.y).toBeGreaterThanOrEqual(FRAME_WALL_CM - 1e-9);
      expect(point.y).toBeLessThanOrEqual(MODULE.height - FRAME_WALL_CM + 1e-9);
    });
    const [, , right, left] = band;
    expect(left.y).toBeGreaterThan(right.y);
    const full = shadePolygon(1);
    expect(Math.max(...full.map((point) => point.y))).toBeCloseTo(MODULE.height - FRAME_WALL_CM, 6);
  });
});
