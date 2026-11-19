import { beforeAll, describe, expect, it } from 'vitest';
import { FOOD_PROFILES } from '../model';
import { formatCelsius, formatPercent, formatSeconds, withMinus } from './format';
import { mainOdorant, mainShare } from './text';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, timeline } = TEST_LOCALE;

describe('formats', () => {
  beforeAll(() => initTestLocale());

  it('writes a real minus sign', () => {
    expect(withMinus('-1.5')).toBe('−1.5');
    expect(formatSeconds(-1.5)).toBe(fill(timeline.value, { seconds: '−1.5' }));
    expect(formatCelsius(-0.2)).toBe(fill(units.celsius, { value: '0' }));
  });

  it('rounds shares to whole percent', () => {
    expect(formatPercent(0.456)).toBe(fill(units.percent, { value: '46' }));
  });

  it('finds the main note of each food', () => {
    expect(mainOdorant(FOOD_PROFILES.cherry)).toBe('benzaldehyde');
    expect(mainShare(FOOD_PROFILES.sweets)).toBeCloseTo(0.8, 6);
  });
});
