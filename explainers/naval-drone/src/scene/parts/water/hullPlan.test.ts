import { describe, expect, it } from 'vitest';
import { SEA } from '../../constants';
import { halfBreadthAt } from '../../geometry/hullLines';
import { hullPlanTexture } from './hullPlan';

const BYTE = 255;

describe('hull plan', () => {
  it('stores the hull half-breadth for the water mask', () => {
    const texture = hullPlanTexture();
    const { columns, rows, x, y, scale } = SEA.plan;
    const data = texture.image.data as Uint8Array;
    const column = Math.floor(((0 - x[0]) / (x[1] - x[0])) * columns);
    const row = Math.floor(((0 - y[0]) / (y[1] - y[0])) * rows);
    const stored = (data[(row * columns + column) * 4] / BYTE) * scale;
    const centreX = x[0] + ((column + 0.5) / columns) * (x[1] - x[0]);
    const centreY = y[0] + ((row + 0.5) / rows) * (y[1] - y[0]);
    expect(stored).toBeCloseTo(halfBreadthAt(centreX, centreY), 2);
    expect(data[0]).toBe(0);
    texture.dispose();
  });
});
