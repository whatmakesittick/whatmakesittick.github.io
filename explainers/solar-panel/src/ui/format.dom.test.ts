import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, setLanguage } from '@core/i18n';
import en from '../../locales/en.json';
import { describePhase, describeSpeed, formatPhase, formatSpeed } from './format';

const { timeline } = en;

describe('solar panel formats', () => {
  beforeAll(async () => {
    await initI18n({ en: () => Promise.resolve(en) });
    await setLanguage('en');
  });

  it('prints the solar time as a clock from 05:00', () => {
    expect(formatPhase(0)).toBe('05:00');
    expect(formatPhase(420)).toBe('12:00');
    expect(formatPhase(90.7)).toBe('06:30');
    expect(formatPhase(839)).toBe('18:59');
  });

  it('names what the sun is doing at that time', () => {
    expect(describePhase(0)).toBe(`05:00 solar time, ${timeline.during.dawn}`);
    expect(describePhase(420)).toBe(`12:00 solar time, ${timeline.during.noon}`);
    expect(describePhase(750)).toBe(`17:30 solar time, ${timeline.during.dusk}`);
  });

  it('gives the playback in minutes of the day per second', () => {
    expect(formatSpeed(10)).toBe('10 min/s');
    expect(describeSpeed(10)).toBe(
      '10 minutes of the day pass every second, the whole day in 84 seconds',
    );
    expect(describeSpeed(60)).toContain('the whole day in 14 seconds');
  });
});
