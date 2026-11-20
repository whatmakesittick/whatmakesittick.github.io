import { beforeAll, describe, expect, it } from 'vitest';
import {
  formatDegrees,
  formatMeters,
  formatMetersPerSecond,
  formatMetersPerSecondDetailed,
  formatNewtons,
  formatPerMinute,
  formatWatts,
} from './format';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units } = TEST_LOCALE;

describe('formats', () => {
  beforeAll(() => initTestLocale());

  it('writes speeds with one or two decimals', () => {
    expect(formatMetersPerSecond(1.68)).toBe(fill(units.metersPerSecond, { value: '1.7' }));
    expect(formatMetersPerSecondDetailed(1.68)).toBe(
      fill(units.metersPerSecond, { value: '1.68' }),
    );
  });

  it('rounds rates, forces, power and angles to whole numbers', () => {
    expect(formatPerMinute(41.6)).toBe(fill(units.perMinute, { value: '42' }));
    expect(formatNewtons(76.4)).toBe(fill(units.newtons, { value: '76' }));
    expect(formatWatts(182.5)).toBe(fill(units.watts, { value: '183' }));
    expect(formatDegrees(-0.2)).toBe(fill(units.degrees, { value: '0' }));
  });

  it('writes lengths with two decimals', () => {
    expect(formatMeters(2.4)).toBe(fill(units.meters, { value: '2.40' }));
  });
});
