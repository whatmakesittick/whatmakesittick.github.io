import { beforeAll, describe, expect, it } from 'vitest';
import { PHASE_RANGES } from '../model';
import {
  formatIodine,
  formatLifetime,
  formatPace,
  formatPercent,
  formatRatio,
  formatTemperature,
  formatIodateSetting,
  paceFactor,
} from './format';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, readouts, chapters } = TEST_LOCALE;

describe('readout formats', () => {
  beforeAll(() => initTestLocale());

  it('shows iodine as eaten before the switch, then in µM and mM', () => {
    expect(formatIodine(0, 9.9, 10)).toBe(readouts.iodineState.eaten);
    expect(formatIodine(0, 10, 10)).toBe(readouts.iodineState.eaten);
    expect(formatIodine(4e-7, 10.00002, 10)).toBe(readouts.iodineState.eaten);
    expect(formatIodine(1e-6, 10.00004, 10)).toBe(fill(units.micromolar, { value: '1' }));
    expect(formatIodine(2e-5, 10.001, 10)).toBe(fill(units.micromolar, { value: '20' }));
    expect(formatIodine(0.0025, 15, 10)).toBe(fill(units.millimolar, { value: '2.50' }));
  });

  it('gives the iodine lifetime in ns, µs or ms, and survives past a millisecond', () => {
    expect(formatLifetime(4.44e-8)).toBe(fill(units.nanoseconds, { value: '44' }));
    expect(formatLifetime(5.6e-6)).toBe(fill(units.microseconds, { value: '5.6' }));
    expect(formatLifetime(5.6e-4)).toBe(fill(units.microseconds, { value: '560' }));
    expect(formatLifetime(1e-3)).toBe(fill(units.milliseconds, { value: '1' }));
    expect(formatLifetime(2e-3)).toBe(chapters.invisibleIodine.survives);
    expect(formatLifetime(Infinity)).toBe(chapters.invisibleIodine.survives);
  });

  it('names the pace against real life', () => {
    expect(formatPace(100, 10, 2)).toBe(readouts.pace.real);
    expect(paceFactor(700, 10, 2)).toBeCloseTo(75, 6);
    expect(formatPace(700, 10, 2)).toBe(fill(readouts.pace.slower, { factor: '75' }));
    expect(formatPace(PHASE_RANGES.complex.start + 1, 10, 2)).toBe(
      fill(readouts.pace.slower, { factor: '4' }),
    );
    expect(formatPace(100, 10, 3)).toBe(fill(readouts.pace.faster, { factor: '2' }));
    expect(formatPace(100, 10, 0)).toBe(fill(readouts.pace.slower, { factor: '4' }));
  });

  it('formats the helix, the ratio and the slider outputs', () => {
    expect(formatPercent(0.5)).toBe(fill(units.percent, { value: '50' }));
    expect(formatRatio(25)).toBe(fill(chapters.tuning.ratioValue, { ratio: '0.50' }));
    expect(formatRatio(10)).toBe(fill(chapters.tuning.ratioValue, { ratio: '1.25' }));
    expect(formatIodateSetting(25)).toBe(fill(units.millimolar, { value: '25.0' }));
    expect(formatTemperature(20)).toBe(fill(units.celsius, { value: '20' }));
  });
});
