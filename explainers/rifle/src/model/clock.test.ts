import { describe, expect, it } from 'vitest';
import { CLOCK_KNOTS, CYCLE_UNITS, msAt, unitsAt } from './clock';
import { EXIT_MS } from './timing';

describe('cycle clock', () => {
  it('maps the scrubber to one 100 ms cycle through the spec knots', () => {
    expect(CLOCK_KNOTS.map((knot) => [knot.units, knot.ms])).toEqual([
      [0, 0],
      [10, 4],
      [14, 4.2],
      [40, EXIT_MS],
      [55, 10],
      [75, 45],
      [95, 90],
      [100, 100],
    ]);
    expect(CYCLE_UNITS).toBe(100);
  });

  it('rises at every knot so the two directions invert each other', () => {
    CLOCK_KNOTS.slice(1).forEach((knot, index) => {
      expect(knot.units).toBeGreaterThan(CLOCK_KNOTS[index].units);
      expect(knot.ms).toBeGreaterThan(CLOCK_KNOTS[index].ms);
    });
    [0, 3.3, 12, 27.5, 40, 61, 99.9].forEach((units) =>
      expect(unitsAt(msAt(units))).toBeCloseTo(units, 9),
    );
    [0, 4.1, 5, 33, 89].forEach((ms) => expect(msAt(unitsAt(ms))).toBeCloseTo(ms, 9));
  });

  it('gives the bullet a quarter of the scrubber for its millisecond', () => {
    expect(msAt(5)).toBeCloseTo(2, 9);
    expect(msAt(27)).toBeCloseTo((4.2 + EXIT_MS) / 2, 9);
    expect(unitsAt(EXIT_MS)).toBe(40);
  });
});
