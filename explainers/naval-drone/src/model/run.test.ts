import { describe, expect, it } from 'vitest';
import { toDegrees } from '@core/math';
import { MOMENT_IDS, PHASE_IDS } from '../ids';
import { BOAT, FINAL_HEADING, FORMATION, ROUTE_TURN, SHIP, START } from './layout';
import {
  FINAL_LENGTH,
  HELD_PHASE,
  MOMENTS,
  PHASE_RANGES,
  ROUTE,
  ROUTE_END,
  RUN_DISTANCE,
  RUN_SECONDS,
  RUN_STEER,
  SHIP_CENTRE,
  SHIP_HEADING,
  TURN_END_DISTANCE,
  TURN_END_TIME,
  TURN_START_TIME,
  boatAt,
  companionsAt,
  distanceAt,
  distanceToShip,
  phaseAt,
  phaseShareAt,
  poseAtDistance,
  speedAt,
  steerAt,
  timeAtDistance,
} from './run';

describe('run timeline', () => {
  it('covers the two minute run with the five phases in order', () => {
    expect(RUN_SECONDS).toBe(120);
    expect(PHASE_RANGES[PHASE_IDS[0]].start).toBe(0);
    expect(PHASE_RANGES[PHASE_IDS[PHASE_IDS.length - 1]].end).toBe(RUN_SECONDS);
    PHASE_IDS.slice(1).forEach((id, index) => {
      expect(PHASE_RANGES[id].start).toBe(PHASE_RANGES[PHASE_IDS[index]].end);
    });
    expect(phaseAt(0)).toBe('launch');
    expect(phaseAt(20)).toBe('hump');
    expect(phaseAt(60)).toBe('cruise');
    expect(phaseAt(90)).toBe('sprint');
    expect(phaseAt(RUN_SECONDS)).toBe('arrival');
    expect(phaseShareAt(25.5)).toBeCloseTo(0.5, 9);
  });

  it('idles below hull speed at launch, cruises at 22 kn and sprints at 42 kn', () => {
    expect(speedAt(0)).toBe(0);
    expect(speedAt(PHASE_RANGES.launch.end)).toBeLessThan(5.7);
    expect(speedAt(60)).toBe(BOAT.cruiseKnots);
    expect(speedAt(100)).toBe(BOAT.topKnots);
    expect(speedAt(RUN_SECONDS)).toBe(BOAT.topKnots);
  });

  it('places the moments on the speed profile', () => {
    expect(MOMENTS.hullSpeed).toBeCloseTo(18.97, 2);
    expect(MOMENTS.humpPeak).toBe(28);
    expect(MOMENTS.onPlane).toBeCloseTo(33, 9);
    expect(MOMENTS.cruiseSpeed).toBe(40);
    expect(MOMENTS.throttleUp).toBe(PHASE_RANGES.sprint.start);
    expect(MOMENTS.topSpeed).toBe(88);
    expect(MOMENTS.alongside).toBe(RUN_SECONDS);
    MOMENT_IDS.slice(1).forEach((id, index) => {
      expect(MOMENTS[id]).toBeGreaterThan(MOMENTS[MOMENT_IDS[index]]);
    });
  });

  it('integrates the speed into about 1.46 km of sea', () => {
    expect(RUN_DISTANCE).toBeCloseTo(1458.8, 0);
    expect(distanceAt(40)).toBeCloseTo(172.85, 2);
    expect(distanceAt(HELD_PHASE)).toBeCloseTo(399.2, 1);
    expect(distanceAt(RUN_SECONDS) - distanceAt(PHASE_RANGES.arrival.start)).toBeCloseTo(172.9, 0);
    expect(timeAtDistance(distanceAt(50))).toBeCloseTo(50, 6);
    expect(distanceToShip(RUN_SECONDS)).toBe(0);
  });
});

describe('route and ship', () => {
  it('turns 20 degrees to port and ends on the final heading', () => {
    expect(ROUTE.length).toBeCloseTo(RUN_DISTANCE, 6);
    expect(FINAL_LENGTH).toBeCloseTo(1156.7, 0);
    expect(ROUTE.end.heading).toBeCloseTo(FINAL_HEADING, 9);
    expect(ROUTE_END[0]).toBeCloseTo(1392.6, 0);
    expect(ROUTE_END[2]).toBeCloseTo(-416.7, 0);
    expect(toDegrees(poseAtDistance(ROUTE_TURN.lead / 2).heading)).toBeCloseTo(0, 9);
    expect(poseAtDistance(0).position).toEqual([START.x, 0, START.z]);
    expect(TURN_START_TIME).toBeCloseTo(40.63, 1);
    expect(TURN_END_TIME).toBeCloseTo(51.43, 1);
    expect(distanceAt(52)).toBeGreaterThan(TURN_END_DISTANCE);
  });

  it('holds the hull and jet chapters on the straight final leg', () => {
    expect(boatAt(HELD_PHASE).heading).toBeCloseTo(FINAL_HEADING, 9);
    expect(boatAt(HELD_PHASE).held).toBe(false);
    expect(boatAt(HELD_PHASE).knots).toBe(BOAT.cruiseKnots);
  });

  it('puts the ship side square across the run, one bow length past the route end', () => {
    const along =
      (SHIP_CENTRE[0] - ROUTE_END[0]) * Math.cos(FINAL_HEADING) +
      (SHIP_CENTRE[2] - ROUTE_END[2]) * Math.sin(FINAL_HEADING);
    expect(along - SHIP.beam / 2).toBeCloseTo(BOAT.halfLength, 9);
    expect(SHIP_HEADING - FINAL_HEADING).toBeCloseTo(Math.PI / 2, 9);
  });

  it('steers the nozzle to port only through the turn', () => {
    expect(steerAt(20)).toBeCloseTo(0, 9);
    expect(steerAt((TURN_START_TIME + TURN_END_TIME) / 2)).toBeCloseTo(-RUN_STEER, 9);
    expect(steerAt(70)).toBeCloseTo(0, 9);
  });
});

describe('companions', () => {
  it('stay away until 70 s and then close in from both sides', () => {
    expect(companionsAt(FORMATION.joinStart - 1)).toEqual([]);
    const joining = companionsAt(77);
    expect(joining).toHaveLength(2);
    const [port, starboard] = companionsAt(100);
    const base = poseAtDistance(distanceAt(100) - FORMATION.back);
    const side = (point: readonly number[]) =>
      (point[0] - base.position[0]) * -Math.sin(base.heading) +
      (point[2] - base.position[2]) * Math.cos(base.heading);
    expect(side(port.position)).toBeCloseTo(-FORMATION.side, 6);
    expect(side(starboard.position)).toBeCloseTo(FORMATION.side, 6);
    expect(port.heading).toBeCloseTo(base.heading, 9);
  });

  it('turn inward while they close in', () => {
    const [port, starboard] = companionsAt(77);
    expect(port.heading).toBeGreaterThan(FINAL_HEADING);
    expect(starboard.heading).toBeLessThan(FINAL_HEADING);
  });
});
