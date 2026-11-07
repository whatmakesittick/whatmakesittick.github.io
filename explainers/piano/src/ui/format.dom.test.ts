import { beforeAll, describe, expect, it } from 'vitest';
import {
  HUNDREDTHS,
  TENTHS,
  WHOLE,
  formatHammerGap,
  formatHammerSpeed,
  formatLevel,
  formatMm,
  formatRange,
  formatRealTime,
  formatUnit,
  hertz,
  hundredths,
  tenths,
  whole,
} from './format';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units } = TEST_LOCALE;

describe('formatters', () => {
  beforeAll(() => initTestLocale());

  it('rounds each number to its own precision with grouped digits', () => {
    expect(whole(12000)).toBe('12,000');
    expect(whole(126.6)).toBe('127');
    expect(tenths(1.65)).toBe('1.7');
    expect(tenths(0.909)).toBe('0.9');
    expect(hundredths(0.3)).toBe('0.30');
    expect(hundredths(0.909)).toBe('0.91');
    expect(formatUnit('aboutMm', 10)).toBe(fill(units.aboutMm, { value: '10' }));
    expect(formatUnit('metresPerSecond', 0.3, HUNDREDTHS)).toBe(
      fill(units.metresPerSecond, { value: '0.30' }),
    );
    expect(formatRange('mmRange', 45, 47)).toBe(fill(units.mmRange, { min: '45', max: '47' }));
    expect(formatMm(8.27)).toBe(fill(units.mm, { value: '8.3' }));
    expect(formatMm(47, WHOLE)).toBe(fill(units.mm, { value: '47' }));
    expect(formatMm(0, TENTHS)).toBe(fill(units.mm, { value: '0.0' }));
  });

  it('writes a pitch in tenths of a hertz below 1,000 Hz and whole hertz above', () => {
    expect(hertz(65.406)).toBe('65.4');
    expect(hertz(261.626)).toBe('261.6');
    expect(hertz(2093.005)).toBe('2,093');
  });

  it('writes the real time in milliseconds below a second and in seconds from there', () => {
    expect(formatRealTime(0)).toBe(fill(units.millis, { value: '0.0' }));
    expect(formatRealTime(67)).toBe(fill(units.millis, { value: '67.0' }));
    expect(formatRealTime(999.9)).toBe(fill(units.millis, { value: '999.9' }));
    expect(formatRealTime(1000)).toBe(fill(units.seconds, { value: '1.00' }));
    expect(formatRealTime(2487.2)).toBe(fill(units.seconds, { value: '2.49' }));
  });

  it('reads the hammer gap in tenths of a millimetre, or on the string', () => {
    expect(formatHammerGap({ contact: false, hammerToStringMm: 47 })).toBe(
      fill(units.mm, { value: '47.0' }),
    );
    expect(formatHammerGap({ contact: false, hammerToStringMm: 1.5 })).toBe(
      fill(units.mm, { value: '1.5' }),
    );
    expect(formatHammerGap({ contact: true, hammerToStringMm: 0 })).toBe(units.onString);
  });

  it('reads the hammer speed as a size, whichever way it moves', () => {
    expect(formatHammerSpeed(1.65)).toBe(fill(units.metresPerSecond, { value: '1.7' }));
    expect(formatHammerSpeed(-0.825)).toBe(fill(units.metresPerSecond, { value: '0.8' }));
    expect(formatHammerSpeed(-0)).toBe(fill(units.metresPerSecond, { value: '0.0' }));
  });

  it('reads the level in whole decibels, or silent', () => {
    expect(formatLevel(0)).toBe(fill(units.db, { value: '0' }));
    expect(formatLevel(-10.06)).toBe(fill(units.db, { value: '-10' }));
    expect(formatLevel(-0.3)).toBe(fill(units.db, { value: '0' }));
    expect(formatLevel(null)).toBe(units.silent);
  });
});
