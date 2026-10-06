import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import en from '../../locales/en.json';
import { DEFAULT_SPEED } from '../model';
import {
  formatAcross,
  formatAlong,
  formatAxisRole,
  formatBoreWidth,
  formatBrightness,
  formatEarthMultiple,
  formatEdgeShift,
  formatFieldNow,
  formatFieldShare,
  formatFringe,
  formatHelium,
  formatLarmor,
  formatLarmorBand,
  formatLines,
  formatRise,
  formatScanTime,
  formatSlowdown,
  formatSpread,
  formatSurplus,
  formatSurplusCount,
  formatT1,
  formatT2,
  formatTimeGauge,
  formatTurbo,
  toSuperscript,
} from './format';

describe('readout formats', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('formats the gauge', () => {
    expect(formatLarmor('field15')).toBe('63.9 MHz');
    expect(formatLarmor('field30')).toBe('127.7 MHz');
    expect(formatTimeGauge({ ms: 1250.4, totalMs: 2500, share: 0.5 })).toBe('1,250 of 2,500 ms');
    expect(formatLines(24)).toBe('24 of 64');
  });

  it('keeps the changing gauge numbers as wide as their totals', () => {
    expect(formatTimeGauge({ ms: 7, totalMs: 2500, share: 0 })).toBe(
      '\u00a0\u00a0\u00a0\u00a07 of 2,500 ms',
    );
    expect(formatLines(3)).toBe('\u00a03 of 64');
  });

  it('formats the overview and the magnet', () => {
    expect(formatFieldNow('field15')).toBe('1.5 T, always on');
    expect(formatBoreWidth()).toBe('70 cm across');
    expect(formatEarthMultiple('field15')).toBe('23,000 to 60,000 times stronger');
    expect(formatEarthMultiple('field30')).toBe('46,000 to 120,000 times stronger');
    expect(formatHelium()).toBe('4.2 K, -269 °C');
    expect(formatFringe('field30')).toBe('5.2 m along the tunnel, 2.8 m to the side');
  });

  it('formats the spins', () => {
    expect(formatLarmorBand('field15')).toBe('63.9 MHz, just below FM radio');
    expect(formatLarmorBand('field30')).toBe('127.7 MHz, just above FM radio');
    expect(formatSurplus('field15')).toBe('about 5 in a million');
    expect(formatSurplusCount('field15')).toBe('about 3.3 × 10¹⁴');
    expect(formatSlowdown('field15', DEFAULT_SPEED)).toBe('about 128 million times');
    expect(formatSlowdown('field30', DEFAULT_SPEED)).toBe('about 255 million times');
    expect(formatSlowdown('field15', DEFAULT_SPEED * 2)).toBe('about 63.9 million times');
    expect(toSuperscript(-19)).toBe('⁻¹⁹');
  });

  it('formats the tip, the relaxation times and the gradients', () => {
    expect([formatAcross(90), formatAlong(90)]).toEqual(['100 %', '0 %']);
    expect(formatAlong(180)).toBe('-100 %');
    expect([formatT1('field15', 'whiteMatter'), formatT2('field15', 'whiteMatter')]).toEqual([
      '884 ms',
      '72 ms',
    ]);
    expect(formatEdgeShift()).toBe('5.4 mT');
    expect(formatFieldShare('field15')).toBe('0.36 %');
    expect(formatSpread()).toBe('230 kHz');
    expect(formatRise()).toBe('0.225 ms');
    expect(formatAxisRole(null)).toBe(en.chapters.gradients.roleValue.sequence);
    expect(formatAxisRole('x')).toBe(en.chapters.gradients.roleValue.x);
  });

  it('formats the picture', () => {
    expect(formatScanTime('t2')).toBe('10.7 min for 256 lines');
    expect(formatScanTime('t1')).toBe('2.1 min for 256 lines');
    expect(formatTurbo('t2')).toBe('about 40 s');
    expect(formatTurbo('t1')).toBe('about 8 s');
    expect(formatBrightness('field15', 't2', 'fluid')).toBe('100 %');
  });
});
