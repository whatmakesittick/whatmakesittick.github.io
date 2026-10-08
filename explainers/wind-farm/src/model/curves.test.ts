import { describe, expect, it } from 'vitest';
import { PITCH_KNOTS, POWER_CURVE, THRUST_CURVE, interpolateKnots } from './curves';
import type { Knot } from './curves';

const LINE: readonly Knot[] = [
  [0, 10],
  [10, 30],
  [20, 0],
];

describe('interpolateKnots', () => {
  it('holds the first and last values beyond the ends', () => {
    expect(interpolateKnots(LINE, -5)).toBe(10);
    expect(interpolateKnots(LINE, 0)).toBe(10);
    expect(interpolateKnots(LINE, 20)).toBe(0);
    expect(interpolateKnots(LINE, 99)).toBe(0);
  });

  it('draws a straight line between neighbouring knots', () => {
    expect(interpolateKnots(LINE, 5)).toBeCloseTo(20, 9);
    expect(interpolateKnots(LINE, 10)).toBeCloseTo(30, 9);
    expect(interpolateKnots(LINE, 15)).toBeCloseTo(15, 9);
  });

  it('reads 2127 kW from the power curve at 7.5 m/s', () => {
    expect(interpolateKnots(POWER_CURVE, 7.5)).toBeCloseTo(2127, 9);
  });
});

describe('curves', () => {
  it('lists every curve with rising wind speeds', () => {
    [POWER_CURVE, THRUST_CURVE, PITCH_KNOTS].forEach((curve) => {
      curve.slice(1).forEach(([x], index) => {
        expect(x).toBeGreaterThan(curve[index][0]);
      });
    });
  });

  it('holds 4200 kW between 12 and 20 m/s', () => {
    expect(interpolateKnots(POWER_CURVE, 12)).toBe(4200);
    expect(interpolateKnots(POWER_CURVE, 16)).toBe(4200);
    expect(interpolateKnots(POWER_CURVE, 20)).toBe(4200);
  });
});
