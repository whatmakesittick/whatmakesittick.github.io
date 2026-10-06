import { describe, expect, it } from 'vitest';
import { FIELDS, earthMultiple, larmorMHz, slowdown, spinSurplus, surplusPerMm3 } from './field';

describe('main field', () => {
  it('compares a 1.5 T and a 3 T magnet with their 0.5 mT lines', () => {
    expect(FIELDS.field15).toEqual({ tesla: 1.5, fringe: { along: 4.0, side: 2.5 } });
    expect(FIELDS.field30).toEqual({ tesla: 3, fringe: { along: 5.2, side: 2.8 } });
  });

  it('makes hydrogen precess at 63.87 MHz and 127.73 MHz', () => {
    expect(larmorMHz('field15')).toBeCloseTo(63.87, 2);
    expect(larmorMHz('field30')).toBeCloseTo(127.73, 2);
  });

  it('leans about 4.9 and 9.9 spins in a million the field way', () => {
    expect(spinSurplus('field15') * 1e6).toBeCloseTo(4.9, 1);
    expect(spinSurplus('field30') * 1e6).toBeCloseTo(9.9, 1);
  });

  it('still adds to about 3 × 10¹⁴ spare spins per cubic millimetre at 1.5 T', () => {
    expect(surplusPerMm3('field15')).toBeGreaterThan(3e14);
    expect(surplusPerMm3('field15')).toBeLessThan(3.5e14);
    expect(surplusPerMm3('field30')).toBeCloseTo(2 * surplusPerMm3('field15'), -10);
  });

  it('is tens of thousands of times the Earth field', () => {
    const times = earthMultiple('field15');
    expect(times.min).toBeCloseTo(23077, 0);
    expect(times.typical).toBeCloseTo(30000, 6);
    expect(times.max).toBeCloseTo(60000, 6);
    expect(earthMultiple('field30').typical).toBeCloseTo(60000, 6);
  });

  it('draws the precession about 128 million times slower than real at 1.5 T', () => {
    expect(slowdown('field15') / 1e6).toBeCloseTo(127.7, 1);
    expect(slowdown('field30') / 1e6).toBeCloseTo(255.5, 1);
  });
});
