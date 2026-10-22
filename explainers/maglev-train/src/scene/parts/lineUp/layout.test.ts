import { describe, expect, it } from 'vitest';
import { centresAlong, mirrorOutline, trapezoid, wallOutline } from './layout';

const DIGITS = 6;

describe('centresAlong', () => {
  it('fits whole pitches and centres them in the span', () => {
    const centres = centresAlong(54, 60, 0.6);
    expect(centres).toHaveLength(10);
    expect(centres[0]).toBeCloseTo(54.3, DIGITS);
    expect(centres[centres.length - 1]).toBeCloseTo(59.7, DIGITS);
  });

  it('shares the spare length between both ends', () => {
    const centres = centresAlong(0, 2.5, 1);
    expect(centres).toHaveLength(2);
    expect(centres[0]).toBeCloseTo(0.75, DIGITS);
  });
});

describe('profile outlines', () => {
  it('chamfers the inner top edge of a wall', () => {
    const wall = wallOutline(2, 0.3, 10, 1.4, 0.05);
    expect(wall).toContainEqual([2.05, 11.4]);
    expect(wall).toContainEqual([2, 11.35]);
  });

  it('mirrors a wall to the other side', () => {
    const mirror = mirrorOutline(wallOutline(2, 0.3, 10, 1.4, 0.05));
    expect(Math.max(...mirror.map(([a]) => a))).toBeCloseTo(-2, DIGITS);
  });

  it('builds a ballast trapezoid wider at the base', () => {
    const [bottomLeft, bottomRight, topRight] = trapezoid(2.2, 1.7, 10.2, 10.52);
    expect(bottomRight[0] - bottomLeft[0]).toBeCloseTo(4.4, DIGITS);
    expect(topRight).toEqual([1.7, 10.52]);
  });
});
