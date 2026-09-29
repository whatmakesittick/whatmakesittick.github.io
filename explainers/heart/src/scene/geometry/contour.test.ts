import { describe, expect, it } from 'vitest';
import { signedArea } from './cap';
import { contourLoops, nestLoops } from './contour';

const GRID = { min: [-20, -20] as const, max: [20, 20] as const, cell: 0.5 };

describe('marching squares', () => {
  it('traces a circle as one closed loop', () => {
    const loops = contourLoops((x, y) => Math.hypot(x, y) - 10, GRID);
    expect(loops).toHaveLength(1);
    for (const point of loops[0]) expect(point.length()).toBeCloseTo(10, 0);
    expect(Math.abs(signedArea(loops[0]))).toBeCloseTo(Math.PI * 100, -1);
  });

  it('separates outlines from the holes inside them', () => {
    const ring = (x: number, y: number) => Math.max(Math.hypot(x, y) - 15, 6 - Math.hypot(x, y));
    const { outers, holes } = nestLoops(contourLoops(ring, GRID));
    expect(outers).toHaveLength(1);
    expect(holes).toHaveLength(1);
    expect(holes[0][0].length()).toBeCloseTo(6, 0);
  });
});
