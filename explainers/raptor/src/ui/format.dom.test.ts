import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, setLanguage } from '@core/i18n';
import en from '../../locales/en.json';
import {
  describePhase,
  describeSpeed,
  formatAboutBar,
  formatAboutKelvin,
  formatAboutTonnes,
  formatBar,
  formatCycle,
  formatCycleBox,
  formatDegrees,
  formatDumps,
  formatExactBar,
  formatKelvinCelsius,
  formatKgPerSecond,
  formatKm,
  formatKmPerHour,
  formatKmPerSecond,
  formatOff,
  formatPercent,
  formatPhase,
  formatPlume,
  formatPropellantPair,
  formatRoute,
  formatSeconds,
  formatSpeed,
  formatTimes,
  formatTonnes,
  unlessOff,
} from './format';

const { timeline } = en;

describe('raptor formats', () => {
  beforeAll(async () => {
    await initI18n({ en: () => Promise.resolve(en) });
    await setLanguage('en');
  });

  it('counts down in tenths of a second before liftoff', () => {
    expect(formatPhase(0)).toBe('T−3.0 s');
    expect(formatPhase(0.6)).toBe('T−2.4 s');
  });

  it('counts up in minutes and seconds from liftoff', () => {
    expect(formatPhase(3)).toBe('T+0:00');
    expect(formatPhase(68.7)).toBe('T+1:05');
    expect(formatPhase(143)).toBe('T+2:20');
    expect(formatPhase(145)).toBe('T+2:22');
  });

  it('names what the engine is doing at that moment', () => {
    expect(describePhase(1)).toBe(`T−2.0 s, ${timeline.during.start}`);
    expect(describePhase(55)).toBe(`T+0:52, ${timeline.during.maxQ}`);
    expect(describePhase(145)).toBe(`T+2:22, ${timeline.during.cutoff}`);
  });

  it('gives the playback as a fraction or a multiple of real time', () => {
    expect([0, 1, 2, 3, 4, 5].map(formatSpeed)).toEqual(['1/8×', '1/4×', '1/2×', '1×', '2×', '4×']);
    expect(describeSpeed(3)).toBe(timeline.realTime);
    expect(describeSpeed(0)).toBe('8 times slower');
    expect(describeSpeed(5)).toBe('4 times faster');
  });

  it('rounds thrust, impulse, flows and speeds to whole units', () => {
    expect(formatTonnes(8250.4)).toBe('8,250 t');
    expect(formatSeconds(329.8)).toBe('330 s');
    expect(formatKgPerSecond(593.2)).toBe('593 kg/s');
    expect(formatKmPerHour(1300.4)).toBe('1,300 km/h');
    expect(formatTimes(163.9)).toBe('164 times');
    expect(formatPercent(0.8)).toBe('80 %');
  });

  it('prints heights, exhaust speed and tilt in tenths', () => {
    expect(formatKm(8.43)).toBe('8.4 km');
    expect(formatKmPerSecond(3.236)).toBe('3.2 km/s');
    expect(formatDegrees(0.54)).toBe('0.5°');
  });

  it('prints air pressure in hundredths of a bar and thin air to three digits', () => {
    expect(formatBar(1.01325)).toBe('1.01 bar');
    expect(formatBar(0.9)).toBe('0.90 bar');
    expect(formatBar(0.00287)).toBe('0.00287 bar');
    expect(formatBar(0.0008)).toBe('0.000800 bar');
  });

  it('marks the approximate values', () => {
    expect(formatAboutBar(330)).toBe('about 330 bar');
    expect(formatExactBar(206)).toBe('206 bar');
    expect(formatAboutKelvin(3500)).toBe('about 3,500 K');
    expect(formatKelvinCelsius(111, -162.15)).toBe('111 K (−162 °C)');
    expect(formatKelvinCelsius(300, 26.85)).toBe('300 K (27 °C)');
    expect(formatAboutTonnes(390)).toBe('about 390 t');
  });

  it('names the plume, the routes, the cycles and the diagram boxes', () => {
    expect(formatPlume('squeezed')).toBe(en.plume.squeezed);
    expect(formatPlume('off')).toBe(en.plume.off);
    expect(formatRoute('methane')).toBe(en.propellants.route.methane);
    expect(formatCycle('fullFlow')).toBe(en.engines.cycle.fullFlow);
    expect(formatPropellantPair('oxygenHydrogen')).toBe(en.engines.propellants.oxygenHydrogen);
    expect(formatDumps(true)).toBe(en.engines.dumps.yes);
    expect(formatDumps(false)).toBe(en.engines.dumps.no);
    expect(formatCycleBox('preburner')).toBe(en.cycle.preburner);
    expect(formatOff()).toBe(en.units.off);
    expect(unlessOff(false, () => 'on')).toBe(en.units.off);
    expect(unlessOff(true, () => 'on')).toBe('on');
  });
});
