import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import en from '../../locales/en.json';
import { MOMENTS, flightSeconds, unitsAt } from '../model';
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
  formatPhase,
  formatSpanComparison,
  formatSpeed,
  formatWeightComparison,
} from './format';
import { fill } from './testing';

const { units, timeline, flight, link } = en;

function clock(text: string): string {
  return fill(timeline.clock, { clock: text });
}

describe('reaper formatting', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('shows the mission clock as hours, minutes and seconds after takeoff', () => {
    expect(formatClock(0)).toBe(clock('0:00:00'));
    expect(formatPhase(100)).toBe(clock('10:25:00'));
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
    expect(formatFlightSeconds(flightSeconds(2))).toBe(
      fill(units.secondsRange, { from: '4.4', to: '6.7' }),
    );
  });

  it('splits hours into hours and minutes', () => {
    expect(formatHoursMinutes(10.838)).toBe(
      fill(units.hoursMinutes, { hours: '10', minutes: '50' }),
    );
  });

  it('gives the satellite link its round trip', () => {
    expect(formatLinkDelay('sat')).toBe(
      fill(link.delay.sat, { roundTrip: fill(units.seconds, { value: '0.48' }) }),
    );
    expect(formatLinkDelay('los')).toBe(link.delay.los);
  });

  it('compares the Reaper with the Predator and the Cessna', () => {
    expect(formatSpanComparison('predator')).toBe(
      fill(flight.span.predator, { reaper: '20.1', other: '16.8', ratio: '1.2' }),
    );
    expect(formatSpanComparison('cessna')).toBe(
      fill(flight.span.cessna, { reaper: '20.1', other: '11', ratio: '1.8', slender: '2.3' }),
    );
    expect(formatWeightComparison('predator')).toBe(
      fill(flight.weight.predator, { reaper: '4,760', other: '1,020', ratio: '4.7' }),
    );
    expect(formatEngineComparison('predator')).toBe(
      fill(flight.engine.predator, { reaper: '900', other: '115', ratio: '7.8' }),
    );
    expect(formatEngineComparison('cessna')).toBe(fill(flight.engine.cessna, { reaper: '900' }));
  });
});
