import { describe, expect, it } from 'vitest';
import { inverseMonotone, linearCurve, monotoneCurve } from './curve';
import type { CurveKey } from './curve';

const RISING: readonly CurveKey[] = [
  [0, 0],
  [10, 1],
  [20, 1],
  [30, 5],
];

describe('monotoneCurve', () => {
  const curve = monotoneCurve(RISING);

  it('passes through every key', () => {
    RISING.forEach(([x, y]) => expect(curve(x)).toBeCloseTo(y, 9));
  });

  it('clamps to the end values outside the keys', () => {
    expect(curve(-5)).toBe(0);
    expect(curve(99)).toBe(5);
  });

  it('never overshoots a flat stretch or turns back', () => {
    let previous = curve(0);
    for (let x = 0.25; x <= 30; x += 0.25) {
      const value = curve(x);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = value;
    }
    expect(curve(15)).toBeCloseTo(1, 9);
  });

  it('stays flat at a peak of non-monotone keys', () => {
    const peak = monotoneCurve([
      [0, 0],
      [1, 2],
      [2, 0],
    ]);
    expect(peak(0.9)).toBeLessThanOrEqual(2);
    expect(peak(1.1)).toBeLessThanOrEqual(2);
  });
});

describe('linearCurve', () => {
  it('interpolates in straight segments', () => {
    const curve = linearCurve(RISING);
    expect(curve(5)).toBeCloseTo(0.5, 9);
    expect(curve(25)).toBeCloseTo(3, 9);
    expect(curve(-1)).toBe(0);
  });
});

describe('inverseMonotone', () => {
  it('finds the x of a value within the tolerance', () => {
    const curve = monotoneCurve(RISING);
    const x = inverseMonotone(curve, 3, [0, 30]);
    expect(curve(x)).toBeCloseTo(3, 1);
  });

  it('clamps values outside the range to its ends', () => {
    const curve = linearCurve(RISING);
    expect(inverseMonotone(curve, -1, [0, 30])).toBe(0);
    expect(inverseMonotone(curve, 9, [0, 30])).toBe(30);
  });
});
