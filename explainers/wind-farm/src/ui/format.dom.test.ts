import { beforeAll, describe, expect, it } from 'vitest';
import { GEAR_RATIO, MAX_RPM, generatorRpm } from '../model';
import {
  formatBrake,
  formatDegrees,
  formatFarmMw,
  formatGearRatio,
  formatGeneratorRpm,
  formatHomes,
  formatLossPercent,
  formatMetres,
  formatMwh,
  formatOperatingState,
  formatPercent,
  formatRatedMw,
  formatRpm,
  formatSpacing,
  formatSquareKm,
  formatTipSpeed,
  formatTurbineMw,
  formatTurnTime,
  formatVoltages,
  formatWind,
} from './format';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, chapters } = TEST_LOCALE;

beforeAll(() => initTestLocale());

describe('wind farm formats', () => {
  it('shows wind to one decimal and rpm to one decimal', () => {
    expect(formatWind(7.5)).toBe(fill(units.metresPerSecond, { value: '7.5' }));
    expect(formatWind(12)).toBe(fill(units.metresPerSecond, { value: '12.0' }));
    expect(formatRpm(MAX_RPM)).toBe(fill(units.rpm, { value: '10.4' }));
  });

  it('rounds the generator speed to the nearest 5 and the gear ratio to the nearest 10', () => {
    expect(formatGeneratorRpm(generatorRpm(MAX_RPM))).toBe(fill(units.rpm, { value: '1,485' }));
    expect(formatGearRatio(GEAR_RATIO)).toBe(fill(chapters.nacelle.gearValue, { ratio: '140' }));
    expect(formatGearRatio(GEAR_RATIO)).toBe('about 1 to 140');
  });

  it('shows the time for one turn, or that the rotor stands still', () => {
    expect(formatTurnTime(MAX_RPM)).toBe(fill(units.seconds, { value: '5.8' }));
    expect(formatTurnTime(0)).toBe(chapters.tower.stopped);
  });

  it('shows the tip speed in whole m/s and km/h to the nearest 10', () => {
    expect(formatTipSpeed(MAX_RPM)).toBe(fill(units.speedPair, { ms: '82', kmh: '290' }));
  });

  it('shows one turbine in hundredths of a megawatt and the farm in tenths', () => {
    expect(formatTurbineMw(4200)).toBe(fill(units.mw, { value: '4.20' }));
    expect(formatTurbineMw(2545)).toBe(fill(units.mw, { value: '2.55' }));
    expect(formatFarmMw(113_400)).toBe(fill(units.mw, { value: '113.4' }));
    expect(formatRatedMw(113.4)).toBe(fill(units.mw, { value: '113.4' }));
  });

  it('shows whole percents except the wake loss', () => {
    expect(formatPercent(0.456)).toBe(fill(units.percent, { value: '46' }));
    expect(formatLossPercent(0.0492)).toBe(fill(units.percent, { value: '4.9' }));
  });

  it('rounds energy, homes, land and pitch', () => {
    expect(formatMwh(1234.6)).toBe(fill(units.mwh, { value: '1,235' }));
    expect(formatHomes(1361)).toBe(fill(units.count, { value: '1,400' }));
    expect(formatSquareKm(38.6)).toBe(fill(units.squareKm, { value: '39' }));
    expect(formatDegrees(12.4)).toBe(fill(units.degrees, { value: '12' }));
    expect(formatMetres(73.7, 1)).toBe(fill(units.metres, { value: '73.7' }));
  });

  it('spells out the spacing, the brake, the state and the voltages', () => {
    expect(formatSpacing(7)).toBe(
      fill(chapters.farm.spacingValue, { metres: '1,050', diameters: '7' }),
    );
    expect(formatBrake(true)).toBe(chapters.nacelle.brakeValue.holding);
    expect(formatBrake(false)).toBe(chapters.nacelle.brakeValue.released);
    expect(formatOperatingState('parked')).toBe(TEST_LOCALE.readouts.state.parked);
    expect(formatVoltages()).toBe(
      fill(chapters.grid.voltagesValue, { generator: '800', collector: '36', grid: '110' }),
    );
  });
});
