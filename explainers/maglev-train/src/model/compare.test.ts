import { describe, expect, it } from 'vitest';
import { COMPARE, ENERGY_WH_PER_SEAT_KM, energyFor } from './compare';

describe('COMPARE', () => {
  it('floats the Transrapid 10 mm, with the 501 km/h record of 2003 (F4.2, F1.14)', () => {
    expect(COMPARE.transrapid).toEqual({
      gapMm: 10,
      recordKmh: 501,
      recordYear: 2003,
      lift: 'transrapid',
    });
  });

  it('floats the SCMaglev about 100 mm, with the 603 km/h record of 2015 (F9.1, F9.3)', () => {
    expect(COMPARE.scmaglev).toEqual({
      gapMm: 100,
      recordKmh: 603,
      recordYear: 2015,
      lift: 'scmaglev',
    });
  });

  it('gives the wheel-rail train no gap and the 574.8 km/h record of 2007 (F9.6)', () => {
    expect(COMPARE.wheelRail).toEqual({
      gapMm: null,
      recordKmh: 574.8,
      recordYear: 2007,
      lift: 'wheelRail',
    });
  });
});

describe('ENERGY_WH_PER_SEAT_KM', () => {
  it("matches the maker's chart", () => {
    expect(ENERGY_WH_PER_SEAT_KM).toEqual({
      200: { maglev: 22, wheel: 29 },
      300: { maglev: 34, wheel: 51 },
      400: { maglev: 52, wheel: null },
    });
  });

  it('uses about a third less per seat than the wheel-rail train at 300 km/h', () => {
    const { maglev, wheel } = ENERGY_WH_PER_SEAT_KM[300];
    expect(maglev / (wheel ?? Number.NaN)).toBeCloseTo(0.67, 2);
  });
});

describe('energyFor', () => {
  it('reads the 300 km/h row at 300 km/h', () => {
    expect(energyFor('kmh300')).toEqual({ maglev: 34, wheel: 51, atKmh: 300 });
  });

  it("reads the maker's top figure at 400 km/h for the 430 km/h run", () => {
    expect(energyFor('kmh430')).toEqual({ maglev: 52, wheel: null, atKmh: 400 });
  });
});
