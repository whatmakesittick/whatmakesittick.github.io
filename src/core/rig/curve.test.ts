import { describe, expect, it } from 'vitest';
import { clampedCurve, clampedVector, periodicCurve, periodicVector } from './curve';
import type { Key } from './curve';

const PERIOD = 1;
const RISE: Key<number>[] = [
  [0, 0],
  [0.5, 2],
  [1, 4],
];
const CYCLE: Key<number>[] = [
  [0, 1],
  [0.25, 3],
  [0.5, 1],
  [0.75, -1],
];

describe('clampedCurve', () => {
  it('holds the end values outside the keys and hits every key inside', () => {
    expect(clampedCurve(RISE, -1)).toBe(0);
    expect(clampedCurve(RISE, 2)).toBe(4);
    expect(clampedCurve(RISE, 0.5)).toBeCloseTo(2, 12);
  });

  it('stays between neighbouring keys on a monotone run', () => {
    const value = clampedCurve(RISE, 0.25);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(2);
  });
});

describe('periodicCurve', () => {
  it('passes through every key and repeats each period', () => {
    for (const [at, value] of CYCLE) {
      expect(periodicCurve(CYCLE, PERIOD, at)).toBeCloseTo(value, 12);
      expect(periodicCurve(CYCLE, PERIOD, at + 3 * PERIOD)).toBeCloseTo(value, 12);
      expect(periodicCurve(CYCLE, PERIOD, at - PERIOD)).toBeCloseTo(value, 12);
    }
  });

  it('is continuous across the wrap', () => {
    const before = periodicCurve(CYCLE, PERIOD, PERIOD - 1e-6);
    const after = periodicCurve(CYCLE, PERIOD, PERIOD + 1e-6);
    expect(before).toBeCloseTo(after, 4);
  });
});

describe('vector curves', () => {
  it('evaluate each channel on its own', () => {
    const keys: Key<readonly [number, number, number]>[] = [
      [0, [0, 1, 2]],
      [1, [4, 1, -2]],
    ];
    expect(clampedVector(keys, 1)).toEqual([4, 1, -2]);
    const wrapped = periodicVector(
      CYCLE.map(([at, value]) => [at, [value, 2 * value, 0] as const] as const),
      PERIOD,
      0.25,
    );
    expect(wrapped[0]).toBeCloseTo(3, 12);
    expect(wrapped[1]).toBeCloseTo(6, 12);
    expect(wrapped[2]).toBeCloseTo(0, 12);
  });
});
