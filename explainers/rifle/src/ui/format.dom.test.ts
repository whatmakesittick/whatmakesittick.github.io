import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, setLanguage } from '@core/i18n';
import en from '../../locales/en.json';
import { EXIT_MS, unitsAt } from '../model';
import {
  describePhase,
  describeSpeed,
  formatCase,
  formatComparison,
  formatGasResult,
  formatHammer,
  formatLock,
  formatMm,
  formatMs,
  formatPercent,
  formatPerMinute,
  formatPhase,
  formatPressure,
  formatRound,
  formatSpeed,
  formatSpeedMs,
  formatSpin,
  formatTimesAir,
  formatTurns,
} from './format';
import { fill } from './testing';

const { timeline, units } = en;

describe('rifle formats', () => {
  beforeAll(async () => {
    await initI18n({ en: () => Promise.resolve(en) });
    await setLanguage('en');
  });

  it('prints the time in the cycle with a decimal only below 10 ms', () => {
    expect(formatPhase(0)).toBe(fill(timeline.ms, { value: '0.0' }));
    expect(formatPhase(unitsAt(4.2))).toBe(fill(timeline.ms, { value: '4.2' }));
    expect(formatPhase(unitsAt(EXIT_MS))).toBe(fill(timeline.ms, { value: '5.3' }));
    expect(formatPhase(unitsAt(45))).toBe(fill(timeline.ms, { value: '45' }));
    expect(formatMs(96)).toBe(fill(units.ms, { value: '96' }));
    expect(formatMs(4)).toBe(fill(units.ms, { value: '4.0' }));
  });

  it('names what happens at that moment', () => {
    expect(describePhase(20)).toBe(
      fill(timeline.value, {
        time: fill(timeline.ms, { value: '4.5' }),
        phase: timeline.during.barrel,
      }),
    );
    expect(describePhase(97)).toContain(timeline.during.ready);
  });

  it('gives the playback in seconds per shot and calls the last stop real pace', () => {
    expect([0, 1, 2, 3].map(formatSpeed)).toEqual(
      ['25.6', '6.4', '1.6', '0.4'].map((seconds) => fill(timeline.perShot, { seconds })),
    );
    expect(formatSpeed(4)).toBe(fill(timeline.realPace, { seconds: '0.1' }));
    expect(describeSpeed(1)).toBe(fill(timeline.speedValue, { seconds: '6.4', factor: '64' }));
    expect(describeSpeed(0)).toBe(fill(timeline.speedValue, { seconds: '25.6', factor: '256' }));
  });

  it('prints the pressure, the speed and the travel in whole units', () => {
    expect(formatPressure(274.6)).toBe(fill(units.mpa, { value: '275' }));
    expect(formatSpeedMs(714.8)).toBe(fill(units.metresPerSecond, { value: '715' }));
    expect(formatMm(385.8)).toBe(fill(units.mm, { value: '386' }));
    expect(formatPercent(0.536)).toBe(fill(units.percent, { value: '54' }));
    expect(formatPerMinute(600)).toBe(fill(units.perMinute, { value: '600' }));
  });

  it('rounds the air comparison and the spin to two figures', () => {
    expect(formatTimesAir(275)).toBe(fill(units.timesAir, { value: '2,700' }));
    expect(formatTimesAir(29)).toBe(fill(units.timesAir, { value: '290' }));
    expect(formatTimesAir(0)).toBe(fill(units.timesAir, { value: '0' }));
    expect(formatSpin(2979.2)).toBe(fill(units.turnsPerSecond, { value: '3,000' }));
    expect(formatSpin(0)).toBe(fill(units.turnsPerSecond, { value: '0' }));
    expect(formatTurns(1.5375)).toBe(fill(units.turns, { value: '1.5' }));
  });

  it('names the stages of the hammer, the bolt, the case and the next round', () => {
    expect(formatHammer('cocking')).toBe(en.firing.hammer.cocking);
    expect(formatLock('turning')).toBe(en.firing.lock.turning);
    expect(formatGasResult('blocked')).toBe(en.gas.result.blocked);
    expect(formatCase('flying')).toBe(en.reload.case.flying);
    expect(formatRound('chambered')).toBe(en.reload.round.chambered);
  });

  it('compares one cycle with a blink, with sound and with a car', () => {
    expect(formatComparison('blink')).toBe(en.reload.compare.blink);
    expect(formatComparison('sound')).toBe(fill(en.reload.compare.sound, { metres: '34' }));
    expect(formatComparison('car')).toBe(fill(en.reload.compare.car, { metres: '2.8' }));
  });
});
