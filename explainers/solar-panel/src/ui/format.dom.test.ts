import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, setLanguage } from '@core/i18n';
import en from '../../locales/en.json';
import {
  describePhase,
  describeSpeed,
  formatAbsorption,
  formatDepth,
  formatEnergyToday,
  formatHeat,
  formatPhase,
  formatScientific,
  formatSignedPercent,
  formatSpeed,
  formatSunElevation,
  formatThickness,
} from './format';

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

  it('shows the sun height only while it is up', () => {
    expect(formatSunElevation(38.2)).toBe('38° up');
    expect(formatSunElevation(-4)).toBe('–');
  });

  it('shows the energy of the day in kilowatt hours', () => {
    expect(formatEnergyToday(1240)).toBe('1.24 kWh today');
  });

  it('gives absorption depths from nanometres of silicon to millimetres', () => {
    expect(formatDepth(0.006)).toBe('0.006 µm');
    expect(formatDepth(0.105)).toBe('0.11 µm');
    expect(formatDepth(2.4)).toBe('2.4 µm');
    expect(formatDepth(156)).toBe('156 µm');
    expect(formatDepth(2900)).toBe('2.9 mm');
    expect(formatAbsorption(1200, 2900)).toBe(en.units.passes);
    expect(formatHeat(1200, 0)).toBe('–');
    expect(formatHeat(600, 0.946)).toBe('0.95 eV');
  });

  it('writes large counts as powers of ten', () => {
    expect(formatScientific(4.39e19)).toBe('4.4 × 10¹⁹');
    expect(formatScientific(9.96e18)).toBe('1.0 × 10¹⁹');
    expect(formatScientific(0)).toBe('0');
  });

  it('signs the temperature loss and leaves unknown thicknesses blank', () => {
    expect(formatSignedPercent(-0.0464)).toBe('-4.6%');
    expect(formatSignedPercent(0.073)).toBe('+7.3%');
    expect(formatThickness(3.2)).toBe('3.2 mm');
    expect(formatThickness(0.14)).toBe('0.14 mm');
    expect(formatThickness(null)).toBe('–');
  });
});
