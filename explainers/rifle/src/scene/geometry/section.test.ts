import { describe, expect, it } from 'vitest';
import { ShapeUtils } from 'three';
import type { Shape } from 'three';
import { arcPoints, keptSectionShape, wholeSectionShape } from './section';
import type { Section } from './section';

const HALF = 10;
const BORE = { y: 0, radius: 4 };
const SQUARE: Section = {
  rim: [
    [0, HALF],
    [-HALF, HALF],
    [-HALF, -HALF],
    [0, -HALF],
  ],
  bores: [BORE],
};

function area(shape: Shape): number {
  const outline = Math.abs(ShapeUtils.area(shape.getPoints()));
  const holes = shape.holes.reduce(
    (sum, hole) => sum + Math.abs(ShapeUtils.area(hole.getPoints())),
    0,
  );
  return outline - holes;
}

describe('section shapes', () => {
  it('mirrors the rim into a whole outline with the bores as holes', () => {
    const shape = wholeSectionShape(SQUARE);
    expect(shape.holes).toHaveLength(1);
    expect(area(shape)).toBeCloseTo(4 * HALF * HALF - Math.PI * BORE.radius ** 2, 0);
  });

  it('keeps the left half and turns each bore into a notch on the cut line', () => {
    const shape = keptSectionShape(SQUARE);
    const points = shape.getPoints();
    expect(shape.holes).toHaveLength(0);
    expect(Math.max(...points.map((point) => point.x))).toBeLessThanOrEqual(1e-9);
    expect(area(shape)).toBeCloseTo(2 * HALF * HALF - (Math.PI * BORE.radius ** 2) / 2, 0);
  });

  it('samples arcs from start to end angle', () => {
    const points = arcPoints([1, 2], 3, 0, Math.PI / 2, 4);
    expect(points).toHaveLength(5);
    expect(points[0][0]).toBeCloseTo(4);
    expect(points[4][1]).toBeCloseTo(5);
  });
});
