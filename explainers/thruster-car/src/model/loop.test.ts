import { describe, expect, it } from 'vitest';
import { CAR_MASS_KG, G } from './constants';
import {
  airTimeFrom,
  bottomLoadG,
  dropSeconds,
  dropSpeed,
  leapAccel,
  leapBurnSeconds,
  leapImpulseKns,
  leapSpeedFor,
  loopAngleAt,
  loopSpeedAt,
  loopTimetable,
  minimumEntrySpeed,
  topLoadG,
  topSpeed,
} from './loop';

describe('loop', () => {
  it('slows from 18 m/s at the entry to 11.3 m/s over the top of a 5 m loop', () => {
    expect(topSpeed(18, 5)).toBeCloseTo(11.3, 1);
    expect(loopSpeedAt(18, 5, 0)).toBe(18);
    expect(minimumEntrySpeed(5)).toBeCloseTo(14, 0);
    expect(topSpeed(minimumEntrySpeed(5), 5)).toBeCloseTo(0, 6);
  });

  it('presses the car into the track at 6.6 g at the entry and 1.6 g at the top', () => {
    expect(bottomLoadG(18, 5)).toBeCloseTo(6.6, 1);
    expect(topLoadG(18, 5)).toBeCloseTo(1.6, 1);
    expect(topLoadG(15, 5)).toBeLessThan(0);
  });

  it('times the loop at about 1.1 s and finds the angle at any second', () => {
    const times = loopTimetable(18, 5);
    const total = times[times.length - 1];
    expect(total).toBeCloseTo(1.08, 1);
    expect(loopAngleAt(times, 0)).toBe(0);
    expect(loopAngleAt(times, total)).toBe(Math.PI);
    expect(loopAngleAt(times, total / 2)).toBeGreaterThan(Math.PI / 2);
    expect(loopAngleAt(times, total / 2)).toBeLessThan(Math.PI / 2 + 0.4);
  });

  it('drops from the 10 m deck in 1.43 s', () => {
    expect(dropSeconds(10)).toBeCloseTo(1.43, 2);
    expect(dropSpeed(10)).toBeCloseTo(G * dropSeconds(10), 9);
  });

  it('leaps 8 m on 40 kN with a 0.7 s burn and 9.6 m/s up', () => {
    const accel = leapAccel(40000);
    expect(accel).toBeCloseTo(40000 / CAR_MASS_KG - G, 9);
    expect(leapSpeedFor(8, accel)).toBeCloseTo(9.6, 1);
    expect(leapBurnSeconds(8, accel)).toBeCloseTo(0.7, 2);
    expect(leapImpulseKns(8, 40000)).toBeCloseTo(27.9, 1);
    const up = leapSpeedFor(8, accel);
    const gained = 0.5 * accel * leapBurnSeconds(8, accel) ** 2;
    expect(gained + up ** 2 / (2 * G)).toBeCloseTo(8, 9);
    expect(airTimeFrom(gained, up)).toBeCloseTo(2.25, 2);
  });
});
