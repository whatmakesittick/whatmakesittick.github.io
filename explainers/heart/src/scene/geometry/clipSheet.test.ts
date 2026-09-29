import { describe, expect, it } from 'vitest';
import { clipCapacity, clipSheet } from './clipSheet';

const SHEET = {
  positions: [0, 0, -1, 2, 0, -1, 0, 2, 1, 2, 2, 1],
  normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
  index: [0, 1, 2, 1, 3, 2],
};

function target() {
  const capacity = clipCapacity(SHEET.index.length);
  return { positions: new Float32Array(capacity * 3), normals: new Float32Array(capacity * 3) };
}

describe('clipped sheets', () => {
  it('copies every triangle when nothing is cut', () => {
    const out = target();
    expect(clipSheet(SHEET, null, out)).toBe(6);
    expect([...out.positions.slice(0, 3)]).toEqual([0, 0, -1]);
  });

  it('keeps only what lies behind the plane and ends it on the plane', () => {
    const out = target();
    const count = clipSheet(SHEET, 0, out);
    expect(count).toBeGreaterThan(0);
    for (let vertex = 0; vertex < count; vertex += 1) {
      expect(out.positions[vertex * 3 + 2]).toBeLessThanOrEqual(1e-6);
    }
    const onPlane = Array.from(
      { length: count },
      (_, vertex) => out.positions[vertex * 3 + 2],
    ).filter((z) => Math.abs(z) < 1e-6);
    expect(onPlane.length).toBeGreaterThan(0);
    expect(out.normals[2]).toBe(1);
  });

  it('drops a sheet that lies wholly in front', () => {
    const out = target();
    expect(clipSheet(SHEET, -2, out)).toBe(0);
  });
});
