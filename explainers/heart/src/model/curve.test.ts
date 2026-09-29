import { describe, expect, it } from 'vitest';
import { monotoneCurve } from './curve';

const PERIOD = 800;

describe('monotoneCurve', () => {
  const curve = monotoneCurve(
    [
      [0, 10],
      [100, 20],
      [300, 20],
      [500, 5],
      [800, 10],
    ],
    PERIOD,
  );

  it('passes through its control points', () => {
    expect(curve(0)).toBeCloseTo(10);
    expect(curve(100)).toBeCloseTo(20);
    expect(curve(300)).toBeCloseTo(20);
    expect(curve(500)).toBeCloseTo(5);
  });

  it('never overshoots between points', () => {
    for (let time = 0; time <= PERIOD; time += 1) {
      expect(curve(time)).toBeGreaterThanOrEqual(5 - 1e-9);
      expect(curve(time)).toBeLessThanOrEqual(20 + 1e-9);
    }
    expect(curve(200)).toBeCloseTo(20);
  });

  it('is periodic and continuous across the seam', () => {
    expect(curve(800)).toBeCloseTo(curve(0));
    expect(curve(-10)).toBeCloseTo(curve(790));
    expect(curve(1600 + 250)).toBeCloseTo(curve(250));
    expect(Math.abs(curve(799.5) - curve(0.5))).toBeLessThan(0.1);
  });

  it('accepts points given in cycle order across the seam', () => {
    const wrapped = monotoneCurve(
      [
        [600, 0],
        [700, 10],
        [100, 10],
        [200, 0],
      ],
      PERIOD,
    );
    expect(wrapped(700)).toBeCloseTo(10);
    expect(wrapped(0)).toBeCloseTo(10);
    expect(wrapped(50)).toBeCloseTo(10);
    expect(wrapped(150)).toBeCloseTo(5);
    expect(wrapped(400)).toBeCloseTo(0);
  });
});
