import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, setLanguage } from '@core/i18n';
import en from '../../locales/en.json';
import {
  describePhase,
  describeSite,
  describeSpeed,
  formatKilogramsPerHour,
  formatKilogramsPerMinute,
  formatOxygen,
  formatPercentRange,
  formatPerAtp,
  formatPhase,
  formatSpeed,
  formatTimes,
} from './format';

const { timeline, sites } = en;

describe('ATP synthase formats', () => {
  beforeAll(async () => {
    await initI18n({ en: () => Promise.resolve(en) });
    await setLanguage('en');
  });

  it('shows real time at the top speed and halves it at every stop below', () => {
    expect(formatSpeed(10)).toBe('×1');
    expect(formatSpeed(9)).toBe('1/2');
    expect(formatSpeed(2)).toBe('1/256');
    expect(formatSpeed(0)).toBe('1/1024');
  });

  it('describes the playback speed in words', () => {
    expect(describeSpeed(10)).toBe('Real time, about 100 turns a second');
    expect(describeSpeed(9)).toBe('2 times slower than life');
    expect(describeSpeed(0)).toBe('1,024 times slower than life');
  });

  it('names the ATP being made at the whole degree of the lap', () => {
    expect(formatPhase(135.7)).toBe('135°');
    expect(describePhase(0)).toBe(`0°, ${timeline.during.firstAtp}`);
    expect(describePhase(135.7)).toBe(`135°, ${timeline.during.secondAtp}`);
    expect(describePhase(359.9)).toBe(`359°, ${timeline.during.thirdAtp}`);
  });

  it('gives protons per ATP with one decimal', () => {
    expect(formatPerAtp(8 / 3)).toBe('2.7');
    expect(formatPerAtp(10 / 3)).toBe('3.3');
  });

  it('reads the oxygen and the ATP it makes', () => {
    expect(formatOxygen(0.25)).toBe('0.25 L a minute');
    expect(formatKilogramsPerMinute(0.0283)).toBe('0.03 kg');
    expect(formatKilogramsPerHour(1.698)).toBe('1.7 kg');
    expect(formatTimes(1.02)).toBe('×1.0');
    expect(formatTimes(30.2)).toBe('×30.2');
  });

  it('gives a single share or a range of shares', () => {
    expect(formatPercentRange({ low: 30, high: 30 })).toBe('30%');
    expect(formatPercentRange({ low: 10, high: 20 })).toBe('10 to 20%');
  });

  it('says what each seat does', () => {
    expect(describeSite('open')).toBe(sites.doing.open);
    expect(describeSite('tight')).toBe(sites.doing.tight);
  });
});
