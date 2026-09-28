import { describe, expect, it } from 'vitest';
import {
  circlePoints,
  circleUnion,
  convexHull,
  distance,
  hullOfCircles,
  roundCorners,
  signedArea,
  smoothOutline,
  subtractCircle,
} from './outline';

const SQUARE = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 4 },
  { x: 0, y: 4 },
];
const SEGMENTS = 64;
const TOLERANCE = 1e-6;

describe('outline', () => {
  it('measures a counter-clockwise square as positive area', () => {
    expect(signedArea(SQUARE)).toBeCloseTo(16);
    expect(signedArea([...SQUARE].reverse())).toBeCloseTo(-16);
  });

  it('drops inner points from the convex hull', () => {
    const hull = convexHull([...SQUARE, { x: 2, y: 2 }, { x: 1, y: 3 }]);
    expect(hull).toHaveLength(4);
    expect(signedArea(hull)).toBeCloseTo(16);
  });

  it('wraps circles with a hull that reaches each circle edge', () => {
    const hull = hullOfCircles(
      [
        { x: 0, y: 0, r: 1 },
        { x: 5, y: 0, r: 2 },
      ],
      SEGMENTS,
    );
    const xs = hull.map((point) => point.x);
    expect(Math.min(...xs)).toBeCloseTo(-1, 2);
    expect(Math.max(...xs)).toBeCloseTo(7, 2);
  });

  it('cuts a circle out of a polygon edge', () => {
    const circle = { x: 4, y: 2, r: 1 };
    const cut = subtractCircle(SQUARE, circle, SEGMENTS);
    cut.forEach((point) => expect(distance(point, circle)).toBeGreaterThan(circle.r - TOLERANCE));
    const halfDisc = (Math.PI * circle.r * circle.r) / 2;
    expect(signedArea(cut)).toBeCloseTo(16 - halfDisc, 1);
  });

  it('traces the outer boundary of two overlapping circles', () => {
    const a = { x: 0, y: 0, r: 2 };
    const b = { x: 3, y: 0, r: 1.5 };
    const union = circleUnion(a, b, SEGMENTS);
    union.forEach((point) => {
      const onA = Math.abs(distance(point, a) - a.r) < 1e-3;
      const onB = Math.abs(distance(point, b) - b.r) < 1e-3;
      expect(onA || onB).toBe(true);
      expect(distance(point, a) >= a.r - 1e-3 || distance(point, b) >= b.r - 1e-3).toBe(true);
    });
  });

  it('rounds sharp corners while staying inside the original square', () => {
    const rounded = roundCorners(SQUARE, 0.5, 30, 4);
    expect(rounded.length).toBeGreaterThan(SQUARE.length);
    rounded.forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(-TOLERANCE);
      expect(point.x).toBeLessThanOrEqual(4 + TOLERANCE);
    });
    expect(signedArea(rounded)).toBeLessThan(16);
  });

  it('passes a smooth outline through every control point', () => {
    const samples = 6;
    const smooth = smoothOutline(SQUARE, samples);
    expect(smooth).toHaveLength(SQUARE.length * samples);
    SQUARE.forEach((point, index) => {
      expect(smooth[index * samples].x).toBeCloseTo(point.x);
      expect(smooth[index * samples].y).toBeCloseTo(point.y);
    });
  });

  it('samples a circle without repeating the first point', () => {
    const points = circlePoints({ x: 1, y: 1, r: 2 }, 8);
    expect(points).toHaveLength(8);
    points.forEach((point) => expect(distance(point, { x: 1, y: 1 })).toBeCloseTo(2));
  });
});
