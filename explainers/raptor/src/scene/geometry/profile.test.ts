import { describe, expect, it } from 'vitest';
import { wallRadius } from '../../model';
import { arcStrand, circleStrand, lineStrand, reversed, smoothStrand, wallStrand } from './profile';

describe('profile strands', () => {
  it('passes a smooth strand through its end points', () => {
    const strand = smoothStrand(
      [
        [4, 0],
        [6, -5],
        [5, -10],
      ],
      20,
    );
    expect(strand[0][0]).toBeCloseTo(4);
    expect(strand[strand.length - 1][1]).toBeCloseTo(-10);
  });

  it('draws lines and arcs at the given sizes', () => {
    expect(lineStrand([0, 0], [2, -4], 4)).toHaveLength(5);
    for (const [radius, y] of arcStrand([10, -5], 3, 0, Math.PI, 8)) {
      expect(Math.hypot(radius - 10, y + 5)).toBeCloseTo(3);
    }
    const circle = circleStrand([20, 0], 2, 12);
    const [first, last] = [circle[0], circle[circle.length - 1]];
    expect(first[0]).toBeCloseTo(last[0]);
    expect(first[1]).toBeCloseTo(last[1]);
  });

  it('follows the chamber wall with an offset', () => {
    for (const [radius, y] of wallStrand(3, -100, -300, 10)) {
      expect(radius).toBeCloseTo(wallRadius(y) + 3);
    }
    expect(reversed(wallStrand(0, -100, -200, 2))[0][1]).toBe(-200);
  });
});
