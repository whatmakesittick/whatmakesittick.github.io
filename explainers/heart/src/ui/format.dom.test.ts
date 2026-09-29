import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, setLanguage } from '@core/i18n';
import en from '../../locales/en.json';
import {
  describePhase,
  describeSpeed,
  formatBetween,
  formatCount,
  formatEffort,
  formatLitres,
  formatMillivolts,
  formatMl,
  formatMlPerSecond,
  formatMmHg,
  formatMs,
  formatPerMinute,
  formatPhase,
  formatReceives,
  formatRole,
  formatSeconds,
  formatSends,
  formatSignal,
  formatSpeed,
  formatValveMoment,
  formatValveState,
  formatWall,
  roundMillivolts,
} from './format';

const { timeline } = en;

describe('heart formats', () => {
  beforeAll(async () => {
    await initI18n({ en: () => Promise.resolve(en) });
    await setLanguage('en');
  });

  it('prints the moment in the beat in whole milliseconds', () => {
    expect(formatPhase(0)).toBe('0 ms');
    expect(formatPhase(320.9)).toBe('320 ms');
    expect(formatMs(799)).toBe('799 ms');
  });

  it('names what the heart is doing at that moment', () => {
    expect(describePhase(100)).toBe(`100 ms into the beat, ${timeline.during.atria}`);
    expect(describePhase(300)).toBe(`300 ms into the beat, ${timeline.during.eject}`);
    expect(describePhase(760)).toBe(`760 ms into the beat, ${timeline.during.rest}`);
  });

  it('gives the playback as a slow-motion fraction', () => {
    expect(formatSpeed(5)).toBe('×1');
    expect(formatSpeed(2)).toBe('1/8');
    expect(formatSpeed(0)).toBe('1/32');
    expect(describeSpeed(5)).toBe(timeline.realTime);
    expect(describeSpeed(1)).toBe('16 times slower than life');
  });

  it('rounds pressures, volumes and flows to whole units', () => {
    expect(formatMmHg(117.6)).toBe('118 mmHg');
    expect(formatMl(95.6)).toBe('96 mL');
    expect(formatMlPerSecond(381.2)).toBe('381 mL/s');
  });

  it('prints the trace in hundredths of a millivolt without a minus on zero', () => {
    expect(formatMillivolts(0.15)).toBe('0.15 mV');
    expect(formatMillivolts(-0.3)).toBe('-0.30 mV');
    expect(formatMillivolts(-0.0001)).toBe('0.00 mV');
  });

  it('rounds the trace to the hundredths it prints', () => {
    expect(roundMillivolts(1.1949)).toBe(1.19);
    expect(roundMillivolts(-0.305)).toBe(-0.3);
  });

  it('prints the exercise readouts', () => {
    expect(formatPerMinute(75)).toBe('75 per minute');
    expect(formatLitres(5.25)).toBe('5.3 L');
    expect(formatSeconds(57.1)).toBe('57 s');
    expect(formatCount(3)).toBe('3');
  });

  it('calls no effort resting and any other effort a percentage', () => {
    expect(formatEffort(0)).toBe(en.units.resting);
    expect(formatEffort(0.45)).toBe('45%');
    expect(formatEffort(1)).toBe('100%');
  });

  it('names the valves, the signal and where the blood goes', () => {
    expect(formatValveState('allClosed')).toBe(en.valves.state.allClosed);
    expect(formatSignal('avNode')).toBe(en.signal.avNode);
    expect(formatReceives('leftAtrium')).toBe(en.chambers.receives.leftAtrium);
    expect(formatSends('leftVentricle')).toBe(en.chambers.sends.leftVentricle);
    expect(formatWall('rightVentricle')).toBe(en.chambers.wall.rightVentricle);
    expect(formatRole('leftAtrium')).toBe(en.chambers.role.leftAtrium);
    expect(formatBetween('mitral')).toBe(en.valves.between.mitral);
  });

  it('tells a moving valve from one that has just made its sound', () => {
    expect(formatValveMoment('opening')).toBe(en.valves.now.opening);
    expect(formatValveMoment('shut')).toBe(en.valves.now.shut);
    expect(formatValveMoment('s2')).toBe(en.valves.sound.s2);
  });
});
