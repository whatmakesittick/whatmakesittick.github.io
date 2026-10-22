import { beforeAll, describe, expect, it } from 'vitest';
import {
  TENTHS,
  WHOLE,
  formatClock,
  formatClockOf,
  formatGap,
  formatHz,
  formatHzRange,
  formatKmOf,
  formatKmh,
  formatMinutesSeconds,
  formatMm,
  formatMmRange,
  formatYear,
  toKilometres,
  toMillimetres,
} from './format';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units } = TEST_LOCALE;

describe('formatters', () => {
  beforeAll(() => initTestLocale());

  it('rounds each quantity to its own precision with grouped digits', () => {
    expect(formatKmh(429.6)).toBe(fill(units.kmh, { value: '430' }));
    expect(formatMm(10.04, TENTHS)).toBe(fill(units.mm, { value: '10.0' }));
    expect(formatMm(1516, WHOLE)).toBe(fill(units.mm, { value: '1,516' }));
    expect(formatHz(231.5)).toBe(fill(units.hz, { value: '232' }));
    expect(formatMmRange(8, 12)).toBe(fill(units.mmRange, { min: '8', max: '12' }));
    expect(formatHzRange(0, 300)).toBe(fill(units.hzRange, { min: '0', max: '300' }));
  });

  it('shows the distance in kilometres out of the whole line', () => {
    expect(formatKmOf(15461, 30000)).toBe(fill(units.kmOf, { value: '15.5', total: '30' }));
    expect(formatKmOf(0, 30000)).toBe(fill(units.kmOf, { value: '0.0', total: '30' }));
    expect(toKilometres(10975)).toBeCloseTo(10.975, 9);
    expect(toMillimetres(0.258)).toBeCloseTo(258, 9);
  });

  it('writes the clock as minutes and two-digit seconds', () => {
    expect(formatClock(0)).toBe(fill(units.clock, { minutes: '0', seconds: '00' }));
    expect(formatClock(65.2)).toBe(fill(units.clock, { minutes: '1', seconds: '05' }));
    expect(formatClock(448.8)).toBe(fill(units.clock, { minutes: '7', seconds: '29' }));
    expect(formatClockOf(65, 448.8)).toBe(
      fill(units.clockOf, {
        elapsed: fill(units.clock, { minutes: '1', seconds: '05' }),
        total: fill(units.clock, { minutes: '7', seconds: '29' }),
      }),
    );
  });

  it('spells the trip out in minutes and seconds', () => {
    expect(formatMinutesSeconds(448.8)).toBe(
      fill(units.minutesSeconds, { minutes: '7', seconds: '29' }),
    );
    expect(formatMinutesSeconds(496.1)).toBe(
      fill(units.minutesSeconds, { minutes: '8', seconds: '16' }),
    );
    expect(formatMinutesSeconds(65)).toBe(
      fill(units.minutesSeconds, { minutes: '1', seconds: '5' }),
    );
  });

  it('reads the magnet gap in tenths of a millimetre, or on skids', () => {
    expect(formatGap({ onSkids: false, gapMm: 10 })).toBe(fill(units.mm, { value: '10.0' }));
    expect(formatGap({ onSkids: false, gapMm: 21.37 })).toBe(fill(units.mm, { value: '21.4' }));
    expect(formatGap({ onSkids: true, gapMm: 30 })).toBe(units.onSkids);
  });

  it('writes a year without a thousands separator', () => {
    expect(formatYear(2003)).toBe('2003');
    expect(formatYear(2015)).toBe('2015');
  });
});
