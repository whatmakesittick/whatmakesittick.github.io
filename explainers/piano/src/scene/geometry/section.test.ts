import { describe, expect, it } from 'vitest';
import { capGeometry, crossingsAtX, isInside, lineCrossings } from './section';
import type { Ring } from './section';

const SQUARE: Ring = [
  { x: -1, z: -1 },
  { x: 1, z: -1 },
  { x: 1, z: 1 },
  { x: -1, z: 1 },
];
const HOLE: Ring = [
  { x: -0.5, z: -0.5 },
  { x: 0.5, z: -0.5 },
  { x: 0.5, z: 0.5 },
  { x: -0.5, z: 0.5 },
];
const DIGITS = 6;

describe('crossingsAtX', () => {
  it('finds the span of a plane through a polygon', () => {
    const [interval] = crossingsAtX([SQUARE], 0.3);
    expect(interval[0]).toBeCloseTo(-1, DIGITS);
    expect(interval[1]).toBeCloseTo(1, DIGITS);
  });

  it('splits the span around a hole', () => {
    const intervals = crossingsAtX([SQUARE, HOLE], 0);
    expect(intervals).toHaveLength(2);
    expect(intervals[0][1]).toBeCloseTo(-0.5, DIGITS);
    expect(intervals[1][0]).toBeCloseTo(0.5, DIGITS);
  });

  it('returns nothing outside the polygon', () => {
    expect(crossingsAtX([SQUARE], 2)).toEqual([]);
  });
});

describe('lineCrossings', () => {
  it('measures intervals along a slanted line in metres', () => {
    const [interval] = lineCrossings([SQUARE], {
      origin: { x: 0, z: 0 },
      direction: { x: 1, z: 1 },
    });
    expect(interval[1] - interval[0]).toBeCloseTo(2 * Math.SQRT2, DIGITS);
  });
});

describe('isInside', () => {
  it('honours holes', () => {
    expect(isInside([SQUARE, HOLE], { x: 0.75, z: 0 })).toBe(true);
    expect(isInside([SQUARE, HOLE], { x: 0, z: 0 })).toBe(false);
  });
});

describe('capGeometry', () => {
  it('lays quads on the cut plane between the slab heights', () => {
    const geometry = capGeometry(0.2, [
      { intervals: crossingsAtX([SQUARE, HOLE], 0.2), bottom: 0.1, top: 0.3 },
    ]);
    const position = geometry.getAttribute('position');
    const xs = new Set<number>();
    const ys = new Set<number>();
    for (let index = 0; index < position.count; index += 1) {
      xs.add(position.getX(index));
      ys.add(Number(position.getY(index).toFixed(DIGITS)));
    }
    expect([...xs]).toEqual([expect.closeTo(0.2, DIGITS)]);
    expect([...ys].sort()).toEqual([0.1, 0.3]);
    expect(geometry.getIndex()?.count).toBe(2 * 6);
  });

  it('follows a varying bottom along the plane', () => {
    const geometry = capGeometry(0, [{ intervals: [[0, 1]], bottom: (z) => -z, top: 1 }]);
    const position = geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 2) {
      expect(position.getY(index)).toBeCloseTo(-position.getZ(index), DIGITS);
    }
    expect(position.count).toBeGreaterThan(4);
  });
});
