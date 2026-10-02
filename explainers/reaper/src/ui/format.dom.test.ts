import { beforeAll, describe, expect, it } from 'vitest';
import { formatNumber } from '@core/format';
import { initI18n, t } from '@core/i18n';
import en from '../../locales/en.json';
import { LOAD_IDS } from '../ids';
import type { MissileStage } from '../ids';
import { MISSION_END_MIN, MISSION_UNITS, MOMENTS, flightSeconds, unitsAt } from '../model';
import { createReaperStore } from '../state';
import {
  describePhase,
  describeSpeed,
  formatAltitude,
  formatClock,
  formatEngineComparison,
  formatFlightSeconds,
  formatFuel,
  formatHoursMinutes,
  formatLinkDelay,
  formatMissileStage,
  formatPhase,
  formatSpanComparison,
  formatSpeed,
  formatWeightComparison,
} from './format';
import { REAPER_READOUTS } from './readouts';
import { fill, isFilled } from './testing';

const { units, timeline } = en;
const MISSILE_STAGES: readonly MissileStage[] = ['none', 'armed', 'flying', 'hit', 'done'];
const STAGE_KEY_PREFIX = 'strike.stage.';

function clock(text: string): string {
  return fill(timeline.clock, { clock: text });
}

describe('reaper formatting', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('shows the mission clock as hours, minutes and seconds after takeoff', () => {
    expect(formatClock(0)).toBe(clock('0:00:00'));
    expect(formatClock(625)).toBe(clock('10:25:00'));
    expect(formatPhase(MISSION_UNITS)).toBe(formatClock(MISSION_END_MIN));
    expect(formatPhase(MOMENTS.impact)).toBe(clock('8:00:25'));
    expect(formatPhase(unitsAt(30))).toBe(clock('0:30:00'));
  });

  it('describes the scrubber with what happens in each phase', () => {
    expect(describePhase(50)).toBe(
      fill(timeline.value, { time: formatPhase(50), phase: timeline.during.loiter }),
    );
  });

  it('names the playback factor', () => {
    expect(formatSpeed(0.25)).toBe(fill(timeline.speedFormat, { factor: '0.25' }));
    expect(describeSpeed(2)).toBe(fill(timeline.speedValue, { factor: '2' }));
  });

  it('shows the altitude in metres and feet', () => {
    expect(formatAltitude(7600)).toBe(fill(units.altitude, { m: '7,600', ft: '24,900' }));
    expect(formatAltitude(0)).toBe(fill(units.altitude, { m: '0', ft: '0' }));
  });

  it('shows the fuel in kilograms and as a share of a full tank', () => {
    expect(formatFuel({ kg: 1814, share: 1 })).toBe(
      fill(units.fuel, { kg: '1,814', share: '100' }),
    );
    expect(formatFuel({ kg: 293.4, share: 0.162 })).toBe(
      fill(units.fuel, { kg: '293', share: '16' }),
    );
  });

  it('shows the missile flight from the fast to the slow case', () => {
    expect(formatFlightSeconds(flightSeconds(8))).toBe(
      fill(units.secondsRange, { from: '18', to: '27' }),
    );
    expect(formatFlightSeconds(flightSeconds(11))).toBe(
      fill(units.secondsRange, { from: '24', to: '37' }),
    );
  });

  it('splits hours into hours and minutes', () => {
    expect(formatHoursMinutes(10.838)).toBe(
      fill(units.hoursMinutes, { hours: '10', minutes: '50' }),
    );
  });

  it('gives the satellite link its hop and its round trip in both modes', () => {
    (['los', 'sat'] as const).forEach((mode) => {
      const text = formatLinkDelay(mode);
      expect(isFilled(text), text).toBe(true);
      ['1.8', '0.24 s', '0.48 s'].forEach((value) => expect(text, mode).toContain(value));
    });
  });

  it('compares the Reaper with the Predator and the Cessna', () => {
    const expected: [string, readonly string[]][] = [
      [formatSpanComparison('predator'), ['20.1', '16.8', '1.2']],
      [formatSpanComparison('cessna'), ['20.1', '11', '1.8', '17', '7.5', '2.3']],
      [formatWeightComparison('predator'), ['4,760', '1,020', '4.7']],
      [formatWeightComparison('cessna'), ['4,760', '1,157', '4.1']],
      [formatEngineComparison('predator'), ['900', '115', '7.8']],
      [formatEngineComparison('cessna'), ['900']],
    ];
    expected.forEach(([text, values]) => {
      expect(isFilled(text), text).toBe(true);
      values.forEach((value) => expect(text).toContain(value));
    });
  });

  it('fills every speed stop for the dock', () => {
    for (let speed = 0.25; speed <= 4; speed += 0.25) {
      const value = formatSpeed(speed);
      const text = t('controls.speedValue', { value, description: describeSpeed(speed) });
      expect(isFilled(text), text).toBe(true);
      expect(text).toContain(value);
      expect(text).toContain(describeSpeed(speed));
      expect(value).toContain(formatNumber(speed));
    }
  });

  it('names every missile stage, the unarmed one included', () => {
    MISSILE_STAGES.forEach((stage) => {
      const text = formatMissileStage(stage);
      expect(isFilled(text), stage).toBe(true);
      expect(text, stage).not.toContain(STAGE_KEY_PREFIX);
    });
  });

  it('fills every gauge readout through the whole mission', () => {
    LOAD_IDS.forEach((load) => {
      for (let phase = 0; phase <= MISSION_UNITS; phase += 5) {
        const state = createReaperStore({ phase, load }).getState();
        REAPER_READOUTS.forEach((row) => {
          const text = row.value(state);
          expect(isFilled(text), `${row.id} at ${phase}: ${text}`).toBe(true);
        });
      }
    });
  });
});
