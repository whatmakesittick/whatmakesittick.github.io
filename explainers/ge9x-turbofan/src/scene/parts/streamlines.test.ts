import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { isTorn, lineLayout, pointAtX, travelCoordinates, visibleLines } from './streamlines';

describe('line layout', () => {
  it('puts the marker line first, at the middle of the tube', () => {
    const { shares, angles } = lineLayout(48, 0.7);
    expect(shares[0]).toBe(0.5);
    expect(angles[0]).toBeCloseTo(0.7);
    expect(shares.every((share) => share >= 0 && share < 1)).toBe(true);
  });

  it('is deterministic and spreads the lines', () => {
    const first = lineLayout(14, 0.7);
    const second = lineLayout(14, 0.7);
    expect(Array.from(first.shares)).toEqual(Array.from(second.shares));
    expect(new Set(Array.from(first.angles, (a) => a.toFixed(3))).size).toBe(14);
  });
});

describe('visible lines', () => {
  it('scales with the particle count and keeps at least one line', () => {
    expect(visibleLines(48, 1500, 1500)).toBe(48);
    expect(visibleLines(48, 900, 1500)).toBe(29);
    expect(visibleLines(14, 1, 240)).toBe(1);
    expect(visibleLines(14, 0, 240)).toBe(0);
  });
});

describe('travel coordinates', () => {
  it('grows slower where the flow is faster', () => {
    const travel = travelCoordinates([1, 1, 2, 2, 1], 4);
    expect(travel[0]).toBe(0);
    expect(travel[2] - travel[1]).toBeGreaterThan(travel[3] - travel[2]);
    expect(travel[3] - travel[2]).toBeCloseTo(0.5);
  });
});

describe('tear detection', () => {
  it('ignores a full turn and flags a jump across the gap', () => {
    expect(isTorn(Math.PI - 0.01, -Math.PI + 0.01, true, 0.3)).toBe(false);
    expect(isTorn(-0.5, 0.5, true, 0.3)).toBe(true);
    expect(isTorn(-0.2, 0.2, true, 0.1)).toBe(true);
    expect(isTorn(-0.2, 0.2, false, 0.1)).toBe(false);
    expect(isTorn(-0.2, 0.2, true, 0)).toBe(false);
  });
});

describe('point at x', () => {
  const positions = [0, 0, 0, 0, 0, 0, 2, 4, 6, 2, 4, 6, 4, 0, 0, 4, 0, 0];

  it('interpolates along the line and clamps at the ends', () => {
    const target = new Vector3();
    pointAtX(positions, 6, 3, 1, target);
    expect(target.toArray()).toEqual([1, 2, 3]);
    pointAtX(positions, 6, 3, 9, target);
    expect(target.x).toBe(4);
    pointAtX(positions, 6, 3, -3, target);
    expect(target.x).toBe(0);
  });
});
