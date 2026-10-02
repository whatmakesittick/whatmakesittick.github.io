import { describe, expect, it } from 'vitest';
import {
  ORBIT_ENTRY_DISTANCE,
  ORBIT_EXIT_DISTANCE,
  ROUTE,
  ROUTE_LENGTH,
  TOUCHDOWN_DISTANCE,
  altitudeAt,
  distanceAt,
  flightAt,
  isOnStation,
} from './flight';
import {
  AIRCRAFT,
  AIRSPEED_KMH,
  CRUISE_ALTITUDE_M,
  LIFTOFF_X,
  LOITER,
  ROLLOUT_END_X,
  RUNWAY,
  THRESHOLD,
  TOUCHDOWN_X,
} from './layout';
import { MOMENTS, PHASE_RANGES } from './mission';

function distanceToLoiterCentre(x: number, z: number): number {
  return Math.hypot(x - LOITER.centre[0], z - LOITER.centre[1]);
}

describe('route', () => {
  it('starts at the threshold and ends at the roll-out stop on the runway', () => {
    const start = ROUTE.poseAt(0);
    const end = ROUTE.poseAt(1);
    expect(start).toMatchObject({ x: THRESHOLD[0], z: THRESHOLD[2], heading: 0 });
    expect(end.x).toBeCloseTo(ROLLOUT_END_X, 6);
    expect(end.z).toBeCloseTo(RUNWAY.z, 6);
    expect(Math.cos(end.heading)).toBeCloseTo(-1, 6);
  });

  it('enters the loiter circle at the entry point and leaves it heading home', () => {
    const entry = ROUTE.poseAt(ORBIT_ENTRY_DISTANCE / ROUTE_LENGTH);
    const exit = ROUTE.poseAt(ORBIT_EXIT_DISTANCE / ROUTE_LENGTH);
    expect(entry.x).toBeCloseTo(LOITER.entry[0], 6);
    expect(entry.z).toBeCloseTo(LOITER.entry[1], 6);
    expect(exit.x).toBeCloseTo(LOITER.centre[0], 6);
    expect(exit.z).toBeCloseTo(LOITER.centre[1] + LOITER.radius, 6);
    expect(Math.cos(exit.heading)).toBeCloseTo(-1, 6);
  });

  it('keeps the aircraft on the circle while on station', () => {
    [42, 50, 61, 62, 70, 77].forEach((units) => {
      const { position } = flightAt(units);
      expect(distanceToLoiterCentre(position[0], position[2])).toBeCloseTo(LOITER.radius, 6);
      expect(isOnStation(units)).toBe(true);
    });
    expect(isOnStation(39)).toBe(false);
    expect(isOnStation(90)).toBe(false);
  });
});

describe('flightAt', () => {
  it('lifts off at the lift-off mark and touches down at the touchdown mark', () => {
    const liftoff = flightAt(MOMENTS.liftoff);
    expect(liftoff.position[0]).toBeCloseTo(LIFTOFF_X, 6);
    expect(liftoff.onGround).toBe(true);
    expect(flightAt(MOMENTS.liftoff + 0.2).onGround).toBe(false);
    const touchdown = ROUTE.poseAt(TOUCHDOWN_DISTANCE / ROUTE_LENGTH);
    expect(touchdown.x).toBeCloseTo(TOUCHDOWN_X, 6);
    expect(flightAt(96).onGround).toBe(true);
    expect(flightAt(95.9).onGround).toBe(false);
  });

  it('rests on its wheels on the ground and reads zero altitude there', () => {
    const parked = flightAt(0);
    expect(parked.position[1]).toBe(AIRCRAFT.restHeight);
    expect(parked.altitude).toBe(0);
    expect(parked.airspeed).toBe(0);
    expect(parked.bank).toBe(0);
    expect(parked.pitch).toBe(0);
    expect(flightAt(100).altitude).toBe(0);
    expect(flightAt(100).airspeed).toBeCloseTo(0, 6);
  });

  it('climbs to the cruise altitude before the handover ends and holds it on station', () => {
    expect(flightAt(PHASE_RANGES.handover.end).altitude).toBeCloseTo(CRUISE_ALTITUDE_M, 6);
    expect(flightAt(50).altitude).toBeCloseTo(CRUISE_ALTITUDE_M, 6);
    expect(flightAt(17).altitude).toBeGreaterThan(0);
    expect(flightAt(17).altitude).toBeLessThan(CRUISE_ALTITUDE_M);
    expect(flightAt(17).pitch).toBeGreaterThan(0);
    expect(flightAt(93).pitch).toBeLessThan(0);
  });

  it('never flies below the ground', () => {
    for (let units = 0; units <= 100; units += 0.25) {
      expect(altitudeAt(distanceAt(units))).toBeGreaterThanOrEqual(0);
    }
  });

  it('moves forward monotonically along the route', () => {
    let last = -1;
    for (let units = 0; units <= 100; units += 0.25) {
      const distance = distanceAt(units);
      expect(distance).toBeGreaterThanOrEqual(last);
      last = distance;
    }
    expect(distanceAt(100)).toBeCloseTo(ROUTE_LENGTH, 6);
  });

  it('banks right in the right-hand orbit and levels out on the legs', () => {
    expect(flightAt(50).bank).toBeGreaterThan(0);
    expect(flightAt(30).bank).toBeCloseTo(0, 6);
    expect(flightAt(84).bank).toBeCloseTo(0, 6);
  });

  it('raises the gear after lift-off and lowers it for landing', () => {
    expect(flightAt(0).gear).toBe(1);
    expect(flightAt(50).gear).toBe(0);
    expect(flightAt(97).gear).toBe(1);
  });

  it('reads the published speeds in cruise and on station', () => {
    expect(flightAt(38).airspeed).toBeCloseTo(AIRSPEED_KMH.cruise, 6);
    expect(flightAt(55).airspeed).toBeCloseTo(AIRSPEED_KMH.loiter, 6);
    expect(flightAt(MOMENTS.liftoff).airspeed).toBeCloseTo(AIRSPEED_KMH.liftoff, 6);
  });
});
