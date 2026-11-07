import { describe, expect, it } from 'vitest';
import { TUNING_PINS, keyX, stringPath } from '../../../model';
import { TUNING_PIN } from './constants';
import { PIANO_STRINGS, stringsIn, unisonOf } from './layout';

const DIGITS = 6;
const TOTAL_STRINGS = 229;
const BAND_COUNTS = { bass: 30, tenor: 31, treble: 168 } as const;

function cross(a: readonly number[], b: readonly number[]): number {
  return a[0] * b[2] - a[2] * b[0];
}

describe('piano strings', () => {
  it('counts every string of the example grand once, in order', () => {
    expect(PIANO_STRINGS).toHaveLength(TOTAL_STRINGS);
    PIANO_STRINGS.forEach((string, index) => expect(string.order).toBe(index));
    expect(stringsIn('bass')).toHaveLength(BAND_COUNTS.bass);
    expect(stringsIn('tenor')).toHaveLength(BAND_COUNTS.tenor);
    expect(stringsIn('treble')).toHaveLength(BAND_COUNTS.treble);
  });

  it('centres each unison on its key', () => {
    [16, 40, 76].forEach((key) => {
      const unison = unisonOf(key);
      const middle = unison.reduce((sum, string) => sum + string.front[0], 0) / unison.length;
      expect(middle).toBeCloseTo(stringPath(key).front[0], DIGITS);
      const strike = stringPath(key).strike[0];
      expect(strike).toBeCloseTo(keyX(key), DIGITS);
    });
  });

  it('runs each string straight from its front termination to its hitch pin', () => {
    PIANO_STRINGS.forEach(({ pin, front, back, hitch, direction }) => {
      expect(pin[0]).toBeCloseTo(front[0], DIGITS);
      [back, hitch].forEach((point) => {
        const offset = [point[0] - front[0], 0, point[2] - front[2]];
        expect(cross(offset, direction)).toBeCloseTo(0, DIGITS);
      });
    });
  });

  it('puts every tuning pin in the pinblock ahead of its front termination', () => {
    PIANO_STRINGS.forEach(({ pin, front }) => {
      expect(pin[2]).toBeLessThanOrEqual(TUNING_PINS.frontZ + 1e-9);
      expect(pin[2]).toBeGreaterThanOrEqual(TUNING_PINS.backZ - 1e-9);
      expect(pin[2] - front[2]).toBeGreaterThanOrEqual(TUNING_PIN.clearance - 1e-9);
    });
  });

  it('keeps the staggered tuning pins clear of each other', () => {
    let nearest = Infinity;
    PIANO_STRINGS.forEach((a, index) =>
      PIANO_STRINGS.slice(index + 1).forEach((b) => {
        nearest = Math.min(nearest, Math.hypot(a.pin[0] - b.pin[0], a.pin[2] - b.pin[2]));
      }),
    );
    expect(nearest).toBeGreaterThan(2 * TUNING_PIN.hole);
  });
});
