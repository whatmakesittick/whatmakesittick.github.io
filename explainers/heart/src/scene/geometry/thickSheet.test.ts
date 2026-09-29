import { describe, expect, it } from 'vitest';
import { openRim, thicken, thickLayout } from './thickSheet';
import { sheetIndex } from './valveFrame';

const GRID = { start: 0, columns: 2, rows: 1 };

function flatSheet() {
  const positions: number[] = [];
  const normals: number[] = [];
  for (let column = 0; column <= GRID.columns; column += 1) {
    for (let row = 0; row <= GRID.rows; row += 1) {
      positions.push(column, row, 0);
      normals.push(0, 0, 1);
    }
  }
  return { positions, normals };
}

describe('thick sheets', () => {
  it('rims the free edge and both sides but not the hinge', () => {
    const edges = openRim(GRID);
    expect(edges).toHaveLength(GRID.columns + 2 * GRID.rows);
    for (const [from, to] of edges) expect([from % 2, to % 2]).not.toEqual([0, 0]);
  });

  it('offsets a front and a back face by the thickness and joins them at the rim', () => {
    const edges = openRim(GRID);
    const layout = thickLayout(sheetIndex(GRID.columns, GRID.rows), 6, edges);
    expect(layout.vertexCount).toBe(12 + edges.length * 4);
    expect(layout.index.length).toBe(sheetIndex(2, 1).length * 2 + edges.length * 6);
    const { positions, normals } = flatSheet();
    const outPositions = new Float32Array(layout.vertexCount * 3);
    const outNormals = new Float32Array(layout.vertexCount * 3);
    thicken(layout, positions, normals, 0.5, outPositions, outNormals);
    expect(outPositions[2]).toBeCloseTo(0.5, 5);
    expect(outPositions[6 * 3 + 2]).toBeCloseTo(-0.5, 5);
    expect(outNormals[6 * 3 + 2]).toBe(-1);
    const rim = 12 * 3;
    expect(Math.abs(outNormals[rim + 2])).toBeLessThan(1e-6);
  });
});
