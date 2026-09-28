import { describe, expect, it } from 'vitest';
import { LAYOUTS, cellAt } from '../../model';
import { GRID, cellRect } from './moduleLayout';
import { diodeX, diodeY, stringPath, stringPaths } from './strings';

function inside(
  point: { x: number; y: number },
  rect: { x: readonly number[]; y: readonly number[] },
) {
  return (
    point.x >= rect.x[0] && point.x <= rect.x[1] && point.y >= rect.y[0] && point.y <= rect.y[1]
  );
}

describe('string paths', () => {
  it('draws one path per string of each layout', () => {
    expect(stringPaths(LAYOUTS.halfCut)).toHaveLength(6);
    expect(stringPaths(LAYOUTS.fullCell)).toHaveLength(3);
  });

  it('runs each half-cut string through its own two columns and its half of the rows', () => {
    const layout = LAYOUTS.halfCut;
    stringPaths(layout).forEach((path) => {
      const [, turnStart, turnEnd] = path.points;
      const cellStart = cellAt(layout, path.group * 2, path.string % 2 === 0 ? 0 : layout.rows - 1);
      expect(cellStart.string).toBe(path.string);
      expect(inside(turnStart, cellRect(layout, cellStart.column, cellStart.row))).toBe(true);
      expect(inside(turnEnd, cellRect(layout, cellStart.column + 1, cellStart.row))).toBe(true);
    });
  });

  it('ends the half-cut strings at the centre line where the diodes sit', () => {
    const centre = (GRID.y[0] + GRID.y[1]) / 2;
    expect(diodeY(LAYOUTS.halfCut)).toBeCloseTo(centre, 6);
    const upper = stringPath(LAYOUTS.halfCut, 0);
    const lower = stringPath(LAYOUTS.halfCut, 1);
    expect(upper.points[0].y).toBeGreaterThan(centre);
    expect(lower.points[0].y).toBeLessThan(centre);
    expect(Math.abs(upper.points[0].y - centre)).toBeLessThan(1);
  });

  it('puts the diode between the two columns of its group', () => {
    const path = stringPath(LAYOUTS.fullCell, 2);
    expect(diodeX(2)).toBeGreaterThan(path.points[0].x);
    expect(diodeX(2)).toBeLessThan(path.points[2].x);
  });
});
