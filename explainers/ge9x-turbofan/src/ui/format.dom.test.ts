import { beforeAll, describe, expect, it } from 'vitest';
import { formatLever, formatMetresValue, formatPercent, formatThrust } from './format';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, readouts, gauge } = TEST_LOCALE;

describe('formats', () => {
  beforeAll(() => initTestLocale());

  it('writes metres with one decimal and shares as whole percent', () => {
    expect(formatMetresValue(4.9)).toBe('4.9');
    expect(formatPercent(0.456)).toBe(fill(units.percent, { value: '46' }));
  });

  it('writes a reverse thrust as a positive number with its own text', () => {
    expect(formatThrust(0.5)).toBe(fill(units.percent, { value: '50' }));
    expect(formatThrust(-0.31)).toBe(fill(readouts.reverse, { percent: '31' }));
  });

  it('names the ends of the lever', () => {
    expect(formatLever(0)).toBe(gauge.idle);
    expect(formatLever(1)).toBe(gauge.takeoff);
    expect(formatLever(0.65)).toBe(fill(gauge.leverValue, { percent: '65' }));
  });
});
