import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, setLanguage } from '@core/i18n';
import en from '../../locales/en.json';
import { START_TIME_ON_DIAL_S } from '../model';
import {
  describePhase,
  describeSpeed,
  formatDialTime,
  formatEscapeAdvance,
  formatSpeed,
  formatTurnPeriod,
} from './format';

const { timeline } = en;

describe('watch formats', () => {
  beforeAll(async () => {
    await initI18n({ en: () => Promise.resolve(en) });
    await setLanguage('en');
  });

  it('shows real time at the top speed and halves it at every stop below', () => {
    expect(formatSpeed(8)).toBe('×1');
    expect(formatSpeed(7)).toBe('1/2');
    expect(formatSpeed(3)).toBe('1/32');
    expect(formatSpeed(0)).toBe('1/256');
  });

  it('describes the playback speed in words', () => {
    expect(describeSpeed(8)).toBe(timeline.realTime);
    expect(describeSpeed(3)).toBe('32 times slower than life');
    expect(describeSpeed(0)).toBe('256 times slower than life');
  });

  it('names what happens at the whole degree of the swing', () => {
    expect(describePhase(0)).toBe(`0° into the swing, ${timeline.during.swingIn}`);
    expect(describePhase(90.8)).toBe(`90° into the swing, ${timeline.during.tick}`);
    expect(describePhase(200)).toBe(`200° into the swing, ${timeline.during.swingBack}`);
    expect(describePhase(270)).toBe(`270° into the swing, ${timeline.during.tock}`);
  });

  it('reads the time on the dial', () => {
    expect(formatDialTime(START_TIME_ON_DIAL_S)).toBe('10:09:30 on the dial');
  });

  it('counts the escape wheel through its 9° beat', () => {
    expect(formatEscapeAdvance(0)).toBe('0.0° of 9°');
    expect(formatEscapeAdvance(3.5)).toBe('3.5° of 9°');
    expect(formatEscapeAdvance(9)).toBe('9.0° of 9°');
  });

  it('gives a turn in hours from an hour up', () => {
    expect(formatTurnPeriod(3600)).toBe('1 h');
    expect(formatTurnPeriod(27_000)).toBe('7.5 h');
  });

  it('gives a turn in minutes from a minute up to an hour', () => {
    expect(formatTurnPeriod(60)).toBe('1 min');
    expect(formatTurnPeriod(3599.4)).toBe('59.99 min');
  });

  it('gives a turn in seconds under a minute', () => {
    expect(formatTurnPeriod(59)).toBe('59 s');
    expect(formatTurnPeriod(5)).toBe('5 s');
  });
});
