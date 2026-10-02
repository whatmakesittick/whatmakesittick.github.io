import { describe, expect, it } from 'vitest';
import { toDegrees, toRadians } from '@core/math';
import { PHASE_IDS } from '../ids';
import {
  DRAG_ACCEL_PER_SPEED_SQ,
  HOVER_STOP_S,
  ORBIT_ENTRY_DISTANCE,
  PHASE_DISTANCES,
  ROUTE,
  distanceAt,
  flightAt,
  pitchAt,
  rollAt,
} from './flight';
import {
  CROSSROADS,
  CRUISE_HEIGHT,
  HOVER_HEIGHT,
  ORBIT,
  ORBIT_HEIGHT,
  PAD,
  ROUTE_LENGTH,
  SPEED_KMH,
} from './layout';
import { MOMENTS, PHASE_RANGES, SORTIE_SECONDS } from './sortie';

const CRUISE_TIME = 20;
const ORBIT_TIME = 38;
const TILT_TOLERANCE_DEG = 1;

function expectOnPad(seconds: number): void {
  const { position, height, onGround, speedKmh } = flightAt(seconds);
  expect(position[0]).toBeCloseTo(PAD[0], 4);
  expect(position[2]).toBeCloseTo(PAD[2], 4);
  expect(height).toBe(0);
  expect(onGround).toBe(true);
  expect(speedKmh).toBe(0);
}

describe('route', () => {
  it('flies the frozen route from the pad back to the pad', () => {
    expect(ROUTE.length).toBeCloseTo(ROUTE_LENGTH, 9);
    expect(PHASE_DISTANCES.landing.to).toBe(ROUTE.length);
    expect(ROUTE.end.x).toBeCloseTo(PAD[0], 6);
    expect(ROUTE.end.z).toBeCloseTo(PAD[2], 6);
  });

  it('marks the distance at the end of every phase', () => {
    expect(PHASE_IDS.map((id) => PHASE_DISTANCES[id].to)).toEqual([
      0,
      78,
      350,
      350 + ORBIT.laps * 2 * Math.PI * ORBIT.radius,
      PHASE_DISTANCES.return.to,
      ROUTE.length,
    ]);
    expect(PHASE_DISTANCES.return.to).toBeCloseTo(990, 0);
    expect(ROUTE.length).toBeCloseTo(1070, 0);
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_DISTANCES[id].from).toBe(PHASE_DISTANCES[PHASE_IDS[index]].to),
    );
  });
});

describe('flightAt', () => {
  it('moves forward monotonically and covers the whole route', () => {
    let last = -1;
    for (let seconds = 0; seconds <= SORTIE_SECONDS; seconds += 0.1) {
      const distance = distanceAt(seconds);
      expect(distance).toBeGreaterThanOrEqual(last);
      last = distance;
    }
    expect(distanceAt(SORTIE_SECONDS)).toBeCloseTo(ROUTE.length, 6);
  });

  it('sits on the pad at the start and at the end', () => {
    expectOnPad(0);
    expectOnPad(SORTIE_SECONDS);
    expectOnPad(MOMENTS.touchdown);
    expectOnPad(MOMENTS.touchdown + 1);
    expect(flightAt(0).armed).toBe(true);
    expect(flightAt(SORTIE_SECONDS).armed).toBe(false);
    expect(flightAt(SORTIE_SECONDS).propRate).toBe(0);
  });

  it('spins up, lifts off at two seconds and hovers at two metres at five', () => {
    expect(flightAt(1).propRate).toBeGreaterThan(0);
    expect(flightAt(1).onGround).toBe(true);
    expect(flightAt(MOMENTS.liftoff).propRate).toBe(1);
    expect(flightAt(MOMENTS.liftoff + 0.5).onGround).toBe(false);
    const hover = flightAt(PHASE_RANGES.climb.start);
    expect(hover.height).toBeCloseTo(HOVER_HEIGHT, 9);
    expect(hover.speedKmh).toBe(0);
    expect(hover.position[0]).toBeCloseTo(PAD[0], 6);
  });

  it('reaches the cruise height and speed at thirteen seconds', () => {
    const cruise = flightAt(MOMENTS.cruise);
    expect(cruise.height).toBeCloseTo(CRUISE_HEIGHT, 9);
    expect(cruise.speedKmh).toBeCloseTo(SPEED_KMH.cruise, 9);
    expect(distanceAt(MOMENTS.cruise)).toBeCloseTo(PHASE_DISTANCES.climb.to, 9);
    expect(flightAt(9).verticalSpeed).toBeGreaterThan(0);
  });

  it('arrives at the orbit entry at twenty seven seconds and circles the crossroads', () => {
    const entry = flightAt(MOMENTS.onStation);
    expect(distanceAt(MOMENTS.onStation)).toBeCloseTo(ORBIT_ENTRY_DISTANCE, 9);
    expect(entry.position[0]).toBeCloseTo(ORBIT.entryX, 6);
    expect(entry.position[2]).toBeCloseTo(0, 6);
    const { position, speedKmh, height } = flightAt(ORBIT_TIME);
    expect(Math.hypot(position[0] - CROSSROADS[0], position[2] - CROSSROADS[2])).toBeCloseTo(
      ORBIT.radius,
      6,
    );
    expect(speedKmh).toBeCloseTo(SPEED_KMH.orbit, 9);
    expect(height).toBeCloseTo(ORBIT_HEIGHT, 9);
  });

  it('turns for home at forty nine seconds and stops over the pad before touching down', () => {
    expect(distanceAt(MOMENTS.turnHome)).toBeCloseTo(PHASE_DISTANCES.orbit.to, 9);
    expect(flightAt(60).speedKmh).toBeCloseTo(SPEED_KMH.cruise, 9);
    const stop = flightAt(HOVER_STOP_S);
    expect(stop.speedKmh).toBeCloseTo(0, 9);
    expect(stop.height).toBeCloseTo(HOVER_HEIGHT, 9);
    expect(stop.position[0]).toBeCloseTo(PAD[0], 4);
    expect(flightAt(77).verticalSpeed).toBeLessThan(0);
  });

  it('pitches nose down in cruise, about thirty degrees at seventy km/h', () => {
    expect(DRAG_ACCEL_PER_SPEED_SQ).toBeCloseTo(0.015, 3);
    const cruise = flightAt(CRUISE_TIME);
    expect(cruise.pitch).toBeGreaterThan(0);
    expect(Math.abs(toDegrees(cruise.pitch) - 30)).toBeLessThan(TILT_TOLERANCE_DEG);
    expect(flightAt(9).pitch).toBeGreaterThan(0);
    expect(flightAt(PHASE_RANGES.climb.start).pitch).toBeCloseTo(0, 9);
    expect(flightAt(72).pitch).toBeLessThan(0);
    expect(pitchAt(0)).toBe(0);
  });

  it('banks left in the orbit and levels out on the straights', () => {
    const orbit = flightAt(ORBIT_TIME);
    expect(orbit.roll).toBeLessThan(-toRadians(20));
    expect(flightAt(CRUISE_TIME).roll).toBeCloseTo(0, 9);
    expect(flightAt(60).roll).toBeCloseTo(0, 9);
    expect(rollAt(MOMENTS.onStation - 1)).toBeCloseTo(0, 9);
    expect(rollAt(MOMENTS.onStation + 1)).toBeLessThan(0);
  });

  it('eases the bank in over the blend time instead of snapping', () => {
    const before = rollAt(MOMENTS.onStation - 0.2);
    const during = rollAt(MOMENTS.onStation);
    const after = rollAt(MOMENTS.onStation + 0.2);
    expect(before).toBeLessThan(0);
    expect(during).toBeLessThan(before);
    expect(after).toBeLessThan(during);
  });

  it('turns left into the orbit and the first half of the S-turn, then right to line up', () => {
    expect(flightAt(ORBIT_TIME).headingRate).toBeLessThan(0);
    expect(flightAt(62).headingRate).toBeLessThan(0);
    expect(flightAt(65.5).headingRate).toBeGreaterThan(0);
    expect(flightAt(CRUISE_TIME).headingRate).toBeCloseTo(0, 6);
    expect(flightAt(CRUISE_TIME).pitchRate).toBeCloseTo(0, 6);
    expect(Math.abs(flightAt(9).pitchRate)).toBeGreaterThan(0);
    expect(Math.abs(flightAt(MOMENTS.onStation).rollRate)).toBeGreaterThan(0);
  });

  it('never flies below the ground', () => {
    for (let seconds = 0; seconds <= SORTIE_SECONDS; seconds += 0.25) {
      expect(flightAt(seconds).height).toBeGreaterThanOrEqual(0);
    }
  });
});
