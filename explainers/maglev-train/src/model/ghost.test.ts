import { describe, expect, it } from 'vitest';
import { GHOST_ACCEL, GHOST_TOP_KMH, LIFT_SECONDS, LINE_M } from './constants';
import { ghostAt } from './ghost';
import { motionAt, realSecondsAt } from './motion';
import { toMs } from './scale';

const METRES_PER_KM = 1000;
const ARRIVAL_UNITS = 940;
const CRUISE_SPAN_SECONDS = 60;
const RAMP_SECONDS = toMs(GHOST_TOP_KMH) / GHOST_ACCEL;

describe('ghostAt', () => {
  it('waits at the platform until the maglev departs', () => {
    [0, LIFT_SECONDS].forEach((seconds) => {
      expect(ghostAt(seconds, 0)).toEqual({ distance: 0, speedKmh: 0, behind: 0 });
    });
  });

  it('has covered about 11.8 km at about 195 km/h when the maglev arrives at 430 km/h', () => {
    const arrival = realSecondsAt(ARRIVAL_UNITS, 'kmh430');
    const { distance } = motionAt(ARRIVAL_UNITS, 'kmh430', 'regen');
    const ghost = ghostAt(arrival, distance);
    expect(arrival).toBeCloseTo(442.8, 1);
    expect(ghost.distance / METRES_PER_KM).toBeCloseTo(11.8, 1);
    expect(ghost.speedKmh).toBeCloseTo(195, 0);
    expect(ghost.behind).toBeCloseTo(LINE_M - ghost.distance, 6);
  });

  it('reaches 300 km/h after about 28 km, then cruises', () => {
    const rampEnd = ghostAt(LIFT_SECONDS + RAMP_SECONDS, 0);
    const later = ghostAt(LIFT_SECONDS + RAMP_SECONDS + CRUISE_SPAN_SECONDS, 0);
    expect(rampEnd.speedKmh).toBeCloseTo(GHOST_TOP_KMH, 6);
    expect(rampEnd.distance / METRES_PER_KM).toBeCloseTo(28, 0);
    expect(later.speedKmh).toBeCloseTo(GHOST_TOP_KMH, 6);
    expect(later.distance - rampEnd.distance).toBeCloseTo(
      toMs(GHOST_TOP_KMH) * CRUISE_SPAN_SECONDS,
      6,
    );
  });

  it('measures how far the maglev is ahead', () => {
    const seconds = LIFT_SECONDS + CRUISE_SPAN_SECONDS;
    const ghost = ghostAt(seconds, LINE_M / 2);
    expect(ghost.behind).toBeCloseTo(LINE_M / 2 - ghost.distance, 9);
  });
});
