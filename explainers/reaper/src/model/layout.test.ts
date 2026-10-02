import { describe, expect, it } from 'vitest';
import {
  AIRCRAFT,
  AIRCRAFT_LAYOUT,
  CRUISE_ALTITUDE,
  HELLFIRE,
  LIFTOFF_DISTANCE,
  LOITER,
  RUNWAY,
  SATELLITE_POSITION,
  SCENE_BOUNDS,
  TARGET,
  THRESHOLD,
} from './layout';

describe('layout', () => {
  it('takes the aircraft dimensions from the facts sheet', () => {
    expect(AIRCRAFT.span).toBe(20.1);
    expect(AIRCRAFT.length).toBe(11);
    expect(AIRCRAFT.height).toBe(3.8);
    expect(AIRCRAFT.propellerBlades).toBe(3);
    expect(AIRCRAFT.sensorBallDiameter).toBe(0.56);
    expect(HELLFIRE.length).toBe(1.62);
    expect(HELLFIRE.count).toBe(4);
  });

  it('stands the aircraft on its wheels with the tail top at its published height', () => {
    expect(AIRCRAFT_LAYOUT.tailTop[1] + AIRCRAFT.restHeight).toBeCloseTo(AIRCRAFT.height, 6);
    expect(AIRCRAFT_LAYOUT.mainGear[1] + AIRCRAFT.restHeight).toBeCloseTo(0, 6);
    expect(AIRCRAFT_LAYOUT.noseGear[1] + AIRCRAFT.restHeight).toBeCloseTo(0, 6);
  });

  it('puts the ball under the nose, the hump on top and the propeller at the tail', () => {
    expect(AIRCRAFT_LAYOUT.sensorBall[1]).toBeLessThan(0);
    expect(AIRCRAFT_LAYOUT.sensorBall[0]).toBeGreaterThan(0);
    expect(AIRCRAFT_LAYOUT.hump[1]).toBeGreaterThan(0);
    expect(AIRCRAFT_LAYOUT.propeller[0]).toBeLessThan(AIRCRAFT_LAYOUT.tailTop[0]);
  });

  it('flies the cruise at 7,600 m drawn as 380 units', () => {
    expect(CRUISE_ALTITUDE).toBe(380);
  });

  it('starts the roll at the threshold and lifts off 80 units down the runway', () => {
    expect(THRESHOLD[0]).toBe(RUNWAY.x[0]);
    expect(LIFTOFF_DISTANCE).toBe(80);
  });

  it('puts the target at the loiter centre on the ground', () => {
    expect(TARGET).toEqual([LOITER.centre[0], 0, LOITER.centre[1]]);
    expect(Math.hypot(LOITER.entry[0] - LOITER.centre[0], LOITER.entry[1] - LOITER.centre[1])).toBe(
      LOITER.radius,
    );
  });

  it('keeps the whole route and the airfield inside the scene bounds', () => {
    expect(SCENE_BOUNDS.x[0]).toBeLessThan(RUNWAY.x[0]);
    expect(SCENE_BOUNDS.x[1]).toBeGreaterThan(LOITER.centre[0] + LOITER.radius);
    expect(SCENE_BOUNDS.z[1]).toBeGreaterThan(LOITER.centre[1] + LOITER.radius);
    expect(SCENE_BOUNDS.y[1]).toBeGreaterThan(CRUISE_ALTITUDE);
    expect(SATELLITE_POSITION[1]).toBeGreaterThan(CRUISE_ALTITUDE);
  });
});
