import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, setLanguage } from '@core/i18n';
import en from '../../locales/en.json';
import { BLACK_HOLES, CENTRE_TIME, HORIZON_TIME, tauAtRadius } from '../model';
import { clocksOf } from '../state';
import {
  describePhase,
  describeSpeed,
  formatClock,
  formatComparison,
  formatDistance,
  formatFallTime,
  formatFlashTone,
  formatHorizon,
  formatLightSpeed,
  formatMass,
  formatPercent,
  formatPhase,
  formatRatio,
  formatRatioValue,
  formatSeconds,
  formatShipClock,
  formatSpeed,
  formatTide,
} from './format';

const { timeline } = en;

describe('black hole formats', () => {
  beforeAll(async () => {
    await initI18n({ en: () => Promise.resolve(en) });
    await setLanguage('en');
  });

  it('prints the probe clock in minutes and seconds', () => {
    expect(formatPhase(0)).toBe('0:00');
    expect(formatPhase(65.9)).toBe('1:05');
    expect(formatPhase(HORIZON_TIME)).toBe('11:53');
    expect(formatPhase(CENTRE_TIME)).toBe('12:23');
    expect(formatClock(3600)).toBe('60:00');
  });

  it('names what happens at that moment', () => {
    expect(describePhase(100)).toBe(`1:40, ${timeline.during.letGo}`);
    expect(describePhase(HORIZON_TIME)).toBe(`11:53, ${timeline.during.inside}`);
  });

  it('gives the playback as a multiple of real time', () => {
    expect([0, 1, 2, 3, 4, 5].map(formatSpeed)).toEqual(['1×', '2×', '4×', '8×', '16×', '32×']);
    expect(describeSpeed(0)).toBe(timeline.realTime);
    expect(describeSpeed(3)).toBe('8 times faster');
  });

  it('never prints the ship clock inside the horizon', () => {
    expect(formatShipClock(clocksOf({ phase: tauAtRadius(4) }).shipClock)).toBe('8:20');
    expect(formatShipClock(Infinity)).toBe(en.clocks.never);
    expect(formatShipClock(clocksOf({ phase: CENTRE_TIME }).shipClock)).toBe(en.clocks.never);
  });

  it('prints the clock ratio with one decimal below ten and a whole number above', () => {
    expect(formatRatio(1.08)).toBe('1.1×');
    expect(formatRatio(2.77)).toBe('2.8×');
    expect(formatRatio(35.6)).toBe('36×');
    expect(formatRatio(Infinity)).toBe('∞');
    expect(formatRatioValue(2.77)).toBe('2.8');
    expect(formatRatioValue(Infinity)).toBe('∞');
  });

  it('prints the distance, the speed and the tide without NaN or infinity', () => {
    expect(formatDistance(2)).toBe('2.0 rs');
    expect(formatDistance(0)).toBe('0.0 rs');
    expect(formatLightSpeed(0.612)).toBe('0.61 c');
    expect(formatLightSpeed(1)).toBe('1.00 c');
    expect(formatTide(9e-7)).toBe(en.units.gBelow);
    expect(formatTide(1.14e-4)).toBe('0.00011 g');
    expect(formatTide(0.5)).toBe('0.5 g');
    expect(formatTide(30)).toBe('30 g');
    expect(formatTide(4.8e6)).toBe('4.8 million g');
  });

  it('prints the flash gap, the brightness and the colour of the flashes', () => {
    expect(formatSeconds(27.7)).toBe('28 s');
    expect(formatSeconds(Infinity)).toBe('∞');
    expect(formatPercent(0.0145)).toBe('1.5 %');
    expect(formatPercent(0.64)).toBe('64 %');
    expect(formatPercent(0)).toBe('0.0 %');
    expect(formatFlashTone('red')).toBe(en.clocks.flash.red);
    expect(formatFlashTone('gone')).toBe(en.clocks.flash.gone);
  });

  it('compares the three black holes the way the facts sheet rounds them', () => {
    expect(formatMass(4.297e6)).toBe('4.3 million Suns');
    expect(formatMass(6.5e9)).toBe('6.5 billion Suns');
    expect(formatMass(21)).toBe('21 Suns');
    expect(formatHorizon(1.269e7)).toBe('12.7 million km');
    expect(formatHorizon(1.92e10)).toBe('19 billion km');
    expect(formatHorizon(62.4)).toBe('62 km');
    expect(formatFallTime(743.4)).toBe('12 minutes');
    expect(formatFallTime(1.12e6)).toBe('13 days');
    expect(formatFallTime(0.0036)).toBe('4 thousandths of a second');
  });

  it('formats every hole from the frozen table', () => {
    expect(formatComparison(BLACK_HOLES.sgrA)).toEqual({
      mass: '4.3 million Suns',
      horizon: '12.7 million km',
      fall: '12 minutes',
      tide: '0.00011 g',
    });
    expect(formatComparison(BLACK_HOLES.m87)).toMatchObject({
      mass: '6.5 billion Suns',
      horizon: '19 billion km',
      fall: '13 days',
      tide: en.units.gBelow,
    });
    expect(formatComparison(BLACK_HOLES.stellar)).toMatchObject({
      mass: '21 Suns',
      horizon: '62 km',
      fall: '4 thousandths of a second',
      tide: '4.8 million g',
    });
  });
});
