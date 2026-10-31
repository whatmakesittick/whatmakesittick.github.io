import { beforeAll, describe, expect, it } from 'vitest';
import {
  HUNDREDTHS,
  TENTHS,
  formatCelsiusOf,
  formatMedium,
  formatPue,
  formatUnit,
  formatYear,
  hundredths,
  percentOf,
  significant,
  tenths,
  whole,
} from './format';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, readouts } = TEST_LOCALE;

describe('formatters', () => {
  beforeAll(() => initTestLocale());

  it('rounds each quantity to its own precision with grouped digits', () => {
    expect(formatUnit('kw', 120)).toBe(fill(units.kw, { value: '120' }));
    expect(formatUnit('mw', 23.04, TENTHS)).toBe(fill(units.mw, { value: '23.0' }));
    expect(formatUnit('m3h', 32640)).toBe(fill(units.m3h, { value: '32,640' }));
    expect(formatUnit('kw', 0.98, HUNDREDTHS)).toBe(fill(units.kw, { value: '0.98' }));
    expect(whole(465.6)).toBe('466');
    expect(tenths(2.59)).toBe('2.6');
    expect(hundredths(0.36)).toBe('0.36');
    expect(significant(0.98, 2)).toBe('0.98');
    expect(significant(9.8, 2)).toBe('9.8');
    expect(percentOf(0.3506)).toBe('35');
  });

  it('names the coolant and reads its temperature in tenths', () => {
    expect(formatMedium('water')).toBe(units.medium.water);
    expect(formatMedium('air')).toBe(units.medium.air);
    expect(formatCelsiusOf(45, 'water')).toBe(
      fill(units.celsiusOf, { value: '45.0', medium: units.medium.water }),
    );
    expect(formatCelsiusOf(35.06, 'air')).toBe(
      fill(units.celsiusOf, { value: '35.1', medium: units.medium.air }),
    );
  });

  it('writes the PUE with two decimals and the site it belongs to', () => {
    expect(formatPue('average')).toBe(
      fill(units.pueOf, { value: '1.54', site: readouts.pueSite.average }),
    );
    expect(formatPue('best')).toBe(
      fill(units.pueOf, { value: '1.09', site: readouts.pueSite.best }),
    );
  });

  it('writes a year without a thousands separator', () => {
    expect(formatYear(2024)).toBe('2024');
    expect(formatYear(2025)).toBe('2025');
  });
});
