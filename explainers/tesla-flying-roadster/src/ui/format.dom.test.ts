import { beforeAll, describe, expect, it } from 'vitest';
import {
  HUNDREDTHS,
  TENTHS,
  WHOLE,
  formatBar,
  formatKmh,
  formatOutcome,
  formatPercent,
  formatRollRate,
  formatSeconds,
  formatThrust,
  formatTorque,
  formatWork,
} from './format';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, chapters } = TEST_LOCALE;
const { outcomeState } = chapters.limits;

describe('formatters', () => {
  beforeAll(() => initTestLocale());

  it('rounds each quantity to its own precision with grouped digits', () => {
    expect(formatBar(285.47)).toBe(fill(units.bar, { value: '285' }));
    expect(formatPercent(0.258)).toBe(fill(units.percent, { value: '26' }));
    expect(formatSeconds(0.5699, HUNDREDTHS)).toBe(fill(units.seconds, { value: '0.57' }));
    expect(formatSeconds(2.188, TENTHS)).toBe(fill(units.seconds, { value: '2.2' }));
    expect(formatSeconds(185.9, WHOLE)).toBe(fill(units.seconds, { value: '186' }));
    expect(formatRollRate(1823.4)).toBe(fill(units.degreesPerSecond, { value: '1,823' }));
  });

  it('shows newtons as kilonewtons and metres per second as km/h', () => {
    expect(formatThrust(9066.7)).toBe(fill(units.kilonewtons, { value: '9.1' }));
    expect(formatThrust(0)).toBe(fill(units.kilonewtons, { value: '0.0' }));
    expect(formatTorque(3600)).toBe(fill(units.kilonewtonMetres, { value: '3.6' }));
    expect(formatKmh(16)).toBe(fill(units.kmh, { value: '58' }));
  });

  it('pairs the stored work in megajoules with kilowatt hours', () => {
    expect(formatWork(142.54)).toBe(fill(units.megajoulesPair, { mj: '143', kwh: '39.6' }));
  });

  it('names a soft landing or the moment the gas runs dry', () => {
    expect(formatOutcome({ ranDry: false, emptyAtSeconds: null, touchdownMs: 2.49 })).toBe(
      fill(outcomeState.cushioned, { speed: '2.5' }),
    );
    expect(formatOutcome({ ranDry: true, emptyAtSeconds: 6.27, touchdownMs: 5.56 })).toBe(
      fill(outcomeState.ranDry, { seconds: '6.3', speed: '5.6' }),
    );
  });
});
