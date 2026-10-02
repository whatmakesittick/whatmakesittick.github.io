import { beforeAll, describe, expect, it } from 'vitest';
import { formatNumber } from '@core/format';
import { initI18n, t } from '@core/i18n';
import en from '../../locales/en.json';
import {
  FLIGHT_MODE_IDS,
  MOVE_IDS,
  PACKET_RATES,
  PHASE_IDS,
  SPEEDSTER_IDS,
  VIDEO_IDS,
} from '../ids';
import { MOMENTS, PHASE_RANGES, SORTIE_SECONDS, packetPeriodMs, rangeFactor } from '../model';
import {
  describePhase,
  describeSpeed,
  formatAmps,
  formatBattery,
  formatClock,
  formatDbm,
  formatDegrees,
  formatGrams,
  formatHoverThrottle,
  formatKmh,
  formatLatency,
  formatLimit,
  formatMetres,
  formatMilliseconds,
  formatMinutes,
  formatMix,
  formatOfHover,
  formatPercent,
  formatPhase,
  formatPicture,
  formatPush,
  formatRatio,
  formatSeconds,
  formatSignal,
  formatSpeed,
  formatStick,
  formatTimes,
  formatVolts,
  formatWho,
  formatWhy,
} from './format';
import { fill, isFilled } from './testing';

const { units, timeline } = en;

function clock(text: string): string {
  return fill(timeline.clock, { clock: text });
}

describe('fpv formatting', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('shows the flight time as minutes and seconds since arming', () => {
    expect(formatClock(0)).toBe(clock('0:00'));
    expect(formatClock(42)).toBe(clock('0:42'));
    expect(formatClock(MOMENTS.touchdown)).toBe(clock('1:18'));
    expect(formatPhase(SORTIE_SECONDS)).toBe(clock('1:20'));
  });

  it('describes the scrubber with what happens in each phase', () => {
    PHASE_IDS.forEach((id) => {
      const start = PHASE_RANGES[id].start;
      expect(describePhase(start)).toBe(
        fill(timeline.value, { time: formatPhase(start), phase: timeline.during[id] }),
      );
    });
  });

  it('names the playback factor', () => {
    expect(formatSpeed(0.25)).toBe(fill(timeline.speedFormat, { factor: '0.25' }));
    expect(describeSpeed()).toBe(timeline.speedValue);
    for (let speed = 0.25; speed <= 4; speed += 0.25) {
      const text = t('controls.speedValue', {
        value: formatSpeed(speed),
        description: describeSpeed(),
      });
      expect(isFilled(text), text).toBe(true);
      expect(text).toContain(formatNumber(speed));
    }
  });

  it('formats the simple units', () => {
    expect(formatKmh(69.6)).toBe(fill(units.kmh, { value: '70' }));
    expect(formatMetres(39.7)).toBe(fill(units.m, { value: '40' }));
    expect(formatGrams(1400)).toBe(fill(units.g, { value: '1,400' }));
    expect(formatPercent(0.874)).toBe(fill(units.percent, { value: '87' }));
    expect(formatOfHover(1.154)).toBe(fill(units.ofHover, { percent: '115' }));
    expect(formatVolts(24.26)).toBe(fill(units.volts, { value: '24.3' }));
    expect(formatAmps(14.49)).toBe(fill(units.amps, { value: '14.5' }));
    expect(formatDbm(-108)).toBe(fill(units.dbm, { value: '-108' }));
    expect(formatMinutes(12.34)).toBe(fill(units.minutes, { value: '12.3' }));
    expect(formatDegrees(30)).toBe(fill(units.degrees, { value: '30' }));
  });

  it('formats the battery, the push, the ratio and the hover throttle', () => {
    expect(formatBattery({ volts: 25.2, share: 1, amps: 0, usedMah: 0 })).toBe(
      fill(units.battery, { volts: '25.2', share: '100' }),
    );
    expect(formatPush(5.66, 0.577)).toBe(fill(units.push, { ms2: '5.7', g: '0.58' }));
    expect(formatRatio(5.714)).toBe(fill(units.ratio, { ratio: '5.7' }));
    expect(formatHoverThrottle(300)).toBe(fill(units.hover, { thrust: '18', speed: '42' }));
  });

  it('shows the packet timing and the reach with two digits', () => {
    expect(PACKET_RATES.map((rate) => formatMilliseconds(packetPeriodMs(rate)))).toEqual(
      ['20', '6.7', '4', '2'].map((value) => fill(units.ms, { value })),
    );
    expect(PACKET_RATES.map((rate) => formatTimes(rangeFactor(rate)))).toEqual(
      ['3.2', '2.2', '1.4', '1'].map((factor) => fill(units.times, { factor })),
    );
  });

  it('shows sprint seconds, with an infinity sign for no tilt', () => {
    expect(formatSeconds(4.9)).toBe(fill(units.seconds, { value: '4.9' }));
    expect(formatSeconds(Number.POSITIVE_INFINITY)).toBe(fill(units.seconds, { value: '∞' }));
  });

  it('fills every move, mode, video, signal and speedster text', () => {
    MOVE_IDS.forEach((move) => {
      expect(isFilled(formatMix(move)), move).toBe(true);
      expect(formatMix(move)).toContain('%');
      expect(isFilled(formatWhy(move)), move).toBe(true);
    });
    FLIGHT_MODE_IDS.forEach((mode) => {
      expect(isFilled(formatStick(mode)), mode).toBe(true);
      expect(isFilled(formatLimit(mode)), mode).toBe(true);
    });
    expect(formatLimit('acro')).toContain('670');
    VIDEO_IDS.forEach((video) => {
      expect(formatLatency(video)).toBe(en.link.latency[video]);
      expect(formatPicture(video)).toBe(en.link.picture[video]);
    });
    expect(formatSignal(1)).toBe(en.link.signal.strong);
    expect(formatSignal(0)).toBe(en.link.signal.lost);
    SPEEDSTER_IDS.forEach((id) => expect(formatWho(id)).toBe(en.speeds.who[id]));
  });
});
