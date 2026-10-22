import { describe, expect, it } from 'vitest';
import type { Point2 } from '../inset/strokes';
import { L0, WHEEL_RAIL } from './constants';
import { band, between, halfOutline, mirrored, offset, roundedRect, widthAt } from './profile';

const DIGITS = 6;

function signedArea(points: readonly Point2[]): number {
  return (
    points.reduce((sum, [x, y], index) => {
      const [nextX, nextY] = points[(index + 1) % points.length];
      return sum + x * nextY - nextX * y;
    }, 0) / 2
  );
}

describe('body outlines', () => {
  it.each([L0.outline, WHEEL_RAIL.outline])(
    'runs from the bottom centre to the roof centre',
    (outline) => {
      const half = halfOutline(outline);
      expect(half[0]).toEqual([0, 0]);
      expect(half[half.length - 1][0]).toBeCloseTo(0, DIGITS);
      expect(half[half.length - 1][1]).toBeCloseTo(outline.height, DIGITS);
      expect(Math.max(...half.map(([a]) => a))).toBeCloseTo(outline.halfWidth, DIGITS);
    },
  );

  it('keeps the real L0 size', () => {
    const full = mirrored(halfOutline(L0.outline));
    const widths = full.map(([a]) => a);
    expect(Math.max(...widths) - Math.min(...widths)).toBeCloseTo(2.9, DIGITS);
    expect(Math.max(...full.map(([, y]) => y))).toBeCloseTo(3.1, DIGITS);
  });

  it('mirrors into a counter-clockwise symmetric polygon', () => {
    const full = mirrored(halfOutline(L0.outline));
    expect(signedArea(full)).toBeGreaterThan(0);
    const sumA = full.reduce((sum, [a]) => sum + a, 0);
    expect(sumA).toBeCloseTo(0, DIGITS);
  });
});

describe('outline helpers', () => {
  const half = halfOutline(L0.outline);

  it('cuts a stretch between two heights', () => {
    const part = between(half, 1, 2);
    expect(part[0][1]).toBeCloseTo(1, DIGITS);
    expect(part[part.length - 1][1]).toBeCloseTo(2, DIGITS);
    expect(part.every(([, y]) => y >= 1 - 1e-9 && y <= 2 + 1e-9)).toBe(true);
  });

  it('reads the half width at a height', () => {
    expect(widthAt(half, 1)).toBeCloseTo(L0.outline.halfWidth, DIGITS);
    expect(widthAt(half, L0.outline.height - 0.01)).toBeLessThan(L0.outline.halfWidth);
  });

  it('offsets a vertical side outward and inward', () => {
    const side: Point2[] = [
      [1, 0],
      [1, 1],
    ];
    expect(offset(side, 0.1)[0][0]).toBeCloseTo(1.1, DIGITS);
    expect(offset(side, -0.1)[1][0]).toBeCloseTo(0.9, DIGITS);
  });

  it('builds a window band just outside the body', () => {
    const strip = band(half, L0.windows.from, L0.windows.to, L0.windows.thickness);
    expect(Math.min(...strip.map(([a]) => a))).toBeGreaterThan(L0.outline.halfWidth * 0.5);
    expect(Math.max(...strip.map(([, y]) => y))).toBeLessThanOrEqual(L0.windows.to + 0.02);
  });

  it('rounds a rectangle inside its bounds', () => {
    const points = roundedRect({ minA: -1, maxA: 1, minB: 0, maxB: 2 }, 0.2);
    expect(Math.max(...points.map(([a]) => a))).toBeCloseTo(1, DIGITS);
    expect(Math.min(...points.map(([, b]) => b))).toBeCloseTo(0, DIGITS);
  });
});
