import { describe, expect, it } from 'vitest';
import { PACKET_RATES } from '../ids';
import { flightAt } from './flight';
import { CROSSROADS, ORBIT, PAD } from './layout';
import {
  SIGNAL_THRESHOLDS,
  VIDEO_SYSTEMS,
  distanceAt,
  linkAt,
  packetPeriodMs,
  rangeFactor,
  sensitivityDbm,
  signalGradeOf,
  signalShareAt,
} from './link';

describe('radio link', () => {
  it('measures the distance from the pilot station', () => {
    expect(distanceAt(PAD)).toBe(6);
    expect(distanceAt([356, 40, 0])).toBeCloseTo(Math.hypot(356, 40), 9);
    expect(linkAt(flightAt(38).position).distance).toBeGreaterThan(CROSSROADS[0] - ORBIT.radius);
  });

  it('spaces the packets by the rate', () => {
    expect(PACKET_RATES.map(packetPeriodMs)).toEqual([20, 1000 / 150, 4, 2]);
  });

  it('hears weaker signals at slower rates and reaches about 3.2 times farther at 50 Hz', () => {
    expect(PACKET_RATES.map(sensitivityDbm)).toEqual([-115, -112, -108, -105]);
    expect(rangeFactor(500)).toBe(1);
    expect(rangeFactor(250)).toBeCloseTo(1.41, 2);
    expect(rangeFactor(150)).toBeCloseTo(2.24, 2);
    expect(rangeFactor(50)).toBeCloseTo(3.16, 2);
  });

  it('keeps the signal strong over the whole short sortie and loses it at ten kilometres', () => {
    expect(signalShareAt(6)).toBe(1);
    expect(signalShareAt(50)).toBe(1);
    expect(signalShareAt(10_000)).toBe(0);
    expect(signalShareAt(20_000)).toBe(0);
    expect(signalShareAt(400)).toBeGreaterThan(SIGNAL_THRESHOLDS.strong);
    expect(signalShareAt(400)).toBeLessThan(0.7);
    for (let seconds = 0; seconds <= 80; seconds += 1) {
      expect(signalGradeOf(linkAt(flightAt(seconds).position).signal)).toBe('strong');
    }
  });

  it('grades the signal by the thresholds', () => {
    expect(signalGradeOf(0.6)).toBe('strong');
    expect(signalGradeOf(0.59)).toBe('good');
    expect(signalGradeOf(0.3)).toBe('good');
    expect(signalGradeOf(0.1)).toBe('weak');
    expect(signalGradeOf(0.04)).toBe('lost');
  });

  it('tabulates the two video systems', () => {
    expect(Object.keys(VIDEO_SYSTEMS)).toEqual(['analogue', 'digital']);
  });
});
