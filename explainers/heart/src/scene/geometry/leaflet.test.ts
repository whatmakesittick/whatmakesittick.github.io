import { describe, expect, it } from 'vitest';
import {
  evenLeaflets,
  freeEdgePoint,
  leafletIndex,
  leafletPoint,
  leafletVertexCount,
  ringFrame,
  ringPoint,
  writeLeaflet,
} from './leaflet';

const FRAME = ringFrame([0, 0, 0], [0, -1, 0], 10);
const SHAPE = {
  kind: 'flap' as const,
  columns: 8,
  rows: 4,
  coaptationDepth: 2,
  belly: 1.5,
  openTilt: 0.2,
  openBulge: 1,
  edgeRise: 0,
  commissureHeight: 0,
  wallInset: 0,
};
const CUSP = {
  ...SHAPE,
  kind: 'cusp' as const,
  coaptationDepth: 5,
  belly: 4,
  openBulge: 0,
  commissureHeight: 7,
  wallInset: 1,
};
const UP = ringFrame([0, 0, 0], [0, 1, 0], 10);
const [FIRST, SECOND, THIRD] = evenLeaflets(3, Math.PI / 6);

describe('valve leaflets', () => {
  it('builds an orthonormal ring frame around the flow', () => {
    expect(FRAME.normal.y).toBeCloseTo(-1, 5);
    expect(FRAME.across.dot(FRAME.normal)).toBeCloseTo(0, 5);
    expect(FRAME.along.dot(FRAME.across)).toBeCloseTo(0, 5);
    expect(ringPoint(FRAME, 0).length()).toBeCloseTo(10, 5);
  });

  it('hinges on the ring at every opening', () => {
    for (const opening of [0, 0.5, 1]) {
      expect(leafletPoint(FRAME, FIRST, SHAPE, opening, 0.5, 0).length()).toBeCloseTo(10, 5);
    }
  });

  it('meets the other leaflets at the centre when shut', () => {
    const tip = leafletPoint(FRAME, FIRST, SHAPE, 0, 0.5, 1);
    const neighbour = leafletPoint(FRAME, SECOND, SHAPE, 0, 0.5, 1);
    expect(tip.distanceTo(neighbour)).toBeLessThan(1e-6);
    expect(Math.hypot(tip.x, tip.z)).toBeLessThan(1e-6);
    expect(
      freeEdgePoint(FRAME, THIRD, SHAPE, 0).distanceTo(ringPoint(FRAME, THIRD.from)),
    ).toBeLessThan(1e-6);
  });

  it('swings into the flow when open and leaves a gap in the middle', () => {
    const tip = leafletPoint(FRAME, FIRST, SHAPE, 1, 0.5, 1);
    expect(tip.y).toBeLessThan(-5);
    expect(Math.hypot(tip.x, tip.z)).toBeGreaterThan(4);
  });

  it('cups each semilunar cusp into a pocket that opens toward the vessel', () => {
    const nadir = leafletPoint(UP, FIRST, CUSP, 0, 0.5, 0);
    const commissure = leafletPoint(UP, FIRST, CUSP, 0, 0, 0);
    expect(nadir.y).toBeCloseTo(0, 5);
    expect(commissure.y).toBeCloseTo(7, 5);
    const belly = leafletPoint(UP, FIRST, CUSP, 0, 0.5, 0.5);
    const tip = leafletPoint(UP, FIRST, CUSP, 0, 0.5, 1);
    expect(belly.y).toBeLessThan(tip.y);
    expect(Math.hypot(tip.x, tip.z)).toBeLessThan(1e-6);
    expect(tip.distanceTo(leafletPoint(UP, SECOND, CUSP, 0, 0.5, 1))).toBeLessThan(1e-6);
  });

  it('folds each cusp back against the wall when open', () => {
    const tip = leafletPoint(UP, FIRST, CUSP, 1, 0.5, 1);
    expect(Math.hypot(tip.x, tip.z)).toBeCloseTo(9, 1);
    expect(tip.y).toBeCloseTo(7, 1);
  });

  it('writes a grid of vertices with matching triangles', () => {
    const target = new Float32Array(leafletVertexCount(SHAPE) * 3);
    writeLeaflet(FRAME, FIRST, SHAPE, 0.3, target);
    expect(target.some((value) => value !== 0)).toBe(true);
    const index = leafletIndex(SHAPE);
    expect(index).toHaveLength(SHAPE.columns * SHAPE.rows * 6);
    expect(Math.max(...index)).toBe(leafletVertexCount(SHAPE) - 1);
  });
});
